"""
DynamoDB client and helper functions.
Provides async-style access to DynamoDB tables through a document-style helper API.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional, Dict, List
from uuid import uuid4

import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)

_dynamodb_resource = None


def get_dynamodb_resource():
    """Get cached boto3 DynamoDB resource."""
    global _dynamodb_resource
    if _dynamodb_resource is None:
        settings = get_settings()
        kwargs = {"region_name": settings.aws_region}
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            kwargs["aws_access_key_id"] = settings.aws_access_key_id
            kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
        _dynamodb_resource = boto3.resource("dynamodb", **kwargs)
    return _dynamodb_resource


def _ensure_table_exists(table_name: str, pk_name: str, sk_name: str = None):
    """Ensure DynamoDB table exists, auto-creating it if missing (for dev convenience)."""
    db = get_dynamodb_resource()
    try:
        table = db.Table(table_name)
        table.load()  # Will trigger error if table does not exist
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            logger.info(f"DynamoDB Table {table_name} not found. Creating it now...")
            key_schema = [{"AttributeName": pk_name, "KeyType": "HASH"}]
            attr_defs = [{"AttributeName": pk_name, "AttributeType": "S"}]

            if sk_name:
                key_schema.append({"AttributeName": sk_name, "KeyType": "RANGE"})
                attr_defs.append({"AttributeName": sk_name, "AttributeType": "S"})

            try:
                db.create_table(
                    TableName=table_name,
                    KeySchema=key_schema,
                    AttributeDefinitions=attr_defs,
                    BillingMode="PAY_PER_REQUEST"
                )
                table.wait_until_exists()
                logger.info(f"DynamoDB Table {table_name} created successfully.")
            except Exception as create_err:
                logger.error(f"Failed to create DynamoDB table: {create_err}")
                raise
        else:
            raise


def utc_now() -> str:
    """Return current UTC timestamp as ISO string."""
    return datetime.now(timezone.utc).isoformat()


# ── Document / Collection References ──────────────────────


class DynamoDBDocumentReference:
    """Points at a single item: a partition key plus a sort key."""

    def __init__(self, table_name: str, partition_key_name: str, partition_key_val: str, sort_key_name: str, sort_key_val: str):
        self.table_name = table_name
        self.partition_key_name = partition_key_name
        self.partition_key_val = partition_key_val
        self.sort_key_name = sort_key_name
        self.sort_key_val = sort_key_val
        self.id = sort_key_val  # matching doc["id"] or snapshot.id


class DynamoDBCollectionReference:
    """Points at all items sharing one partition key."""

    def __init__(self, table_name: str, partition_key_name: str, partition_key_val: str, sort_key_name: str):
        self.table_name = table_name
        self.partition_key_name = partition_key_name
        self.partition_key_val = partition_key_val
        self.sort_key_name = sort_key_name

    def document(self, doc_id: str) -> DynamoDBDocumentReference:
        return DynamoDBDocumentReference(
            table_name=self.table_name,
            partition_key_name=self.partition_key_name,
            partition_key_val=self.partition_key_val,
            sort_key_name=self.sort_key_name,
            sort_key_val=doc_id,
        )


# ── Collection Creator Helpers ─────────────────────────────


def resumes_col(user_id: str) -> DynamoDBCollectionReference:
    return DynamoDBCollectionReference("resumes", "user_id", user_id, "id")


def jds_col(user_id: str) -> DynamoDBCollectionReference:
    return DynamoDBCollectionReference("job_descriptions", "user_id", user_id, "id")


def sessions_col(user_id: str) -> DynamoDBCollectionReference:
    return DynamoDBCollectionReference("sessions", "user_id", user_id, "id")


def messages_col(user_id: str, session_id: str) -> DynamoDBCollectionReference:
    # Partitioned by session_id in DynamoDB for easy extraction
    return DynamoDBCollectionReference("messages", "session_id", session_id, "id")


def user_questions_col(user_id: str) -> DynamoDBCollectionReference:
    return DynamoDBCollectionReference("questions", "user_id", user_id, "id")


# ── CRUD Operations ───────────────────────────────────────


async def create_document(
    collection_ref: DynamoDBCollectionReference,
    data: Dict[str, Any],
    doc_id: Optional[str] = None,
) -> str:
    """Create a document in DynamoDB."""
    db = get_dynamodb_resource()
    settings = get_settings()
    table_name = f"{settings.aws_dynamodb_table_prefix}{collection_ref.table_name}"
    _ensure_table_exists(table_name, collection_ref.partition_key_name, collection_ref.sort_key_name)

    table = db.Table(table_name)
    doc_id = doc_id or uuid4().hex

    # Clone data and inject partition / sort keys
    item = dict(data)
    item[collection_ref.partition_key_name] = collection_ref.partition_key_val
    item[collection_ref.sort_key_name] = doc_id
    item["id"] = doc_id
    item["created_at"] = item.get("created_at") or utc_now()

    try:
        table.put_item(Item=item)
        logger.info(f"DynamoDB put_item: id={doc_id} in {table_name}")
    except ClientError as e:
        logger.error(f"DynamoDB put failed: {e}")
        raise

    return doc_id


async def get_document(doc_ref: DynamoDBDocumentReference) -> Optional[Dict[str, Any]]:
    """Retrieve document from DynamoDB."""
    db = get_dynamodb_resource()
    settings = get_settings()
    table_name = f"{settings.aws_dynamodb_table_prefix}{doc_ref.table_name}"
    _ensure_table_exists(table_name, doc_ref.partition_key_name, doc_ref.sort_key_name)

    table = db.Table(table_name)
    key = {
        doc_ref.partition_key_name: doc_ref.partition_key_val,
        doc_ref.sort_key_name: doc_ref.sort_key_val
    }

    try:
        res = table.get_item(Key=key)
        item = res.get("Item")
        if not item:
            return None
        item["id"] = doc_ref.sort_key_val
        return item
    except ClientError as e:
        logger.error(f"DynamoDB get failed: {e}")
        return None


async def update_document(
    doc_ref: DynamoDBDocumentReference,
    data: Dict[str, Any],
) -> None:
    """Update fields of a document in DynamoDB."""
    db = get_dynamodb_resource()
    settings = get_settings()
    table_name = f"{settings.aws_dynamodb_table_prefix}{doc_ref.table_name}"
    _ensure_table_exists(table_name, doc_ref.partition_key_name, doc_ref.sort_key_name)

    table = db.Table(table_name)
    key = {
        doc_ref.partition_key_name: doc_ref.partition_key_val,
        doc_ref.sort_key_name: doc_ref.sort_key_val
    }

    updates = dict(data)
    updates["updated_at"] = utc_now()

    update_expr = []
    attr_names = {}
    attr_vals = {}

    for k, v in updates.items():
        if k in [doc_ref.partition_key_name, doc_ref.sort_key_name, "id"]:
            continue
        placeholder_k = f"#k_{k}"
        placeholder_v = f":v_{k}"
        update_expr.append(f"{placeholder_k} = {placeholder_v}")
        attr_names[placeholder_k] = k
        attr_vals[placeholder_v] = v

    if not update_expr:
        return

    try:
        table.update_item(
            Key=key,
            UpdateExpression="SET " + ", ".join(update_expr),
            ExpressionAttributeNames=attr_names,
            ExpressionAttributeValues=attr_vals
        )
        logger.info(f"DynamoDB update_item: id={doc_ref.sort_key_val} in {table_name}")
    except ClientError as e:
        logger.error(f"DynamoDB update failed: {e}")
        raise


async def list_documents(
    collection_ref: DynamoDBCollectionReference,
    order_by: Optional[str] = "created_at",
    direction: str = "DESCENDING",
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """List documents matching partition key."""
    db = get_dynamodb_resource()
    settings = get_settings()
    table_name = f"{settings.aws_dynamodb_table_prefix}{collection_ref.table_name}"
    _ensure_table_exists(table_name, collection_ref.partition_key_name, collection_ref.sort_key_name)

    table = db.Table(table_name)

    from boto3.dynamodb.conditions import Key

    try:
        res = table.query(
            KeyConditionExpression=Key(collection_ref.partition_key_name).eq(collection_ref.partition_key_val)
        )
        items = res.get("Items", [])

        if order_by:
            reverse = (direction == "DESCENDING")
            items.sort(key=lambda x: x.get(order_by, ""), reverse=reverse)

        return items[:limit]
    except ClientError as e:
        logger.error(f"DynamoDB query failed: {e}")
        return []


async def delete_document(doc_ref: DynamoDBDocumentReference) -> None:
    """Delete document from DynamoDB."""
    db = get_dynamodb_resource()
    settings = get_settings()
    table_name = f"{settings.aws_dynamodb_table_prefix}{doc_ref.table_name}"
    _ensure_table_exists(table_name, doc_ref.partition_key_name, doc_ref.sort_key_name)

    table = db.Table(table_name)
    key = {
        doc_ref.partition_key_name: doc_ref.partition_key_val,
        doc_ref.sort_key_name: doc_ref.sort_key_val
    }

    try:
        table.delete_item(Key=key)
        logger.info(f"DynamoDB delete_item: id={doc_ref.sort_key_val} in {table_name}")
    except ClientError as e:
        logger.error(f"DynamoDB delete failed: {e}")
        raise
