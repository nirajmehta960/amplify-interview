import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ModernAnalyticsDashboard from "./ModernAnalyticsDashboard";

const AnalyticsDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-light-gray">
      {/* Demo Header */}
      <div className="bg-white border-b border-light-gray">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                className="rounded-professional"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-dark-navy font-display">
                  Modern Analytics Dashboard Demo
                </h1>
                <p className="text-muted-foreground text-sm">
                  Big Interview-inspired design with enhanced visual hierarchy
                  and warmth
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-accent-green text-white">Demo Version</Badge>
              <Button
                variant="outline"
                size="sm"
                className="rounded-professional"
                onClick={() =>
                  window.open("/dashboard/analytics/modern", "_blank")
                }
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Content */}
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-professional shadow-professional p-8 mb-8"
        >
          <h2 className="text-xl font-bold text-dark-navy font-display mb-4">
            Design Features Showcase
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-dark-navy">Color Palette</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-primary-blue rounded"></div>
                  <span className="text-sm">Primary Blue (#3871C2)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-accent-green rounded"></div>
                  <span className="text-sm">Accent Green (#3AB54A)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-accent-orange rounded"></div>
                  <span className="text-sm">Accent Orange (#FFA94D)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-dark-navy rounded"></div>
                  <span className="text-sm">Dark Navy (#1C1F2A)</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-dark-navy">Typography</h3>
              <div className="space-y-2">
                <div className="text-lg font-bold text-dark-navy font-display">
                  Inter Font Family
                </div>
                <div className="text-sm text-muted-foreground">
                  Bold headers with soft gray body text
                </div>
                <div className="text-xs text-muted-foreground">
                  Modern, readable, professional
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-dark-navy">Layout Elements</h3>
              <div className="space-y-2">
                <div className="text-sm">• Rounded cards (16px radius)</div>
                <div className="text-sm">• Soft drop shadows</div>
                <div className="text-sm">• Generous padding</div>
                <div className="text-sm">• Alternating backgrounds</div>
                <div className="text-sm">• Interactive hover effects</div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-professional shadow-professional p-8 mb-8"
        >
          <h2 className="text-xl font-bold text-dark-navy font-display mb-4">
            Component Showcase
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-dark-navy">
                Score Summary Cards
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-light-gray rounded-professional text-center">
                  <div className="text-2xl font-bold text-primary-blue">87</div>
                  <div className="text-xs text-muted-foreground">
                    Overall Score
                  </div>
                </div>
                <div className="p-4 bg-light-gray rounded-professional text-center">
                  <div className="text-2xl font-bold text-accent-green">
                    8/8
                  </div>
                  <div className="text-xs text-muted-foreground">Questions</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-dark-navy">
                Interactive Elements
              </h3>
              <div className="space-y-2">
                <Button className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white rounded-professional">
                  Primary Action
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-professional"
                >
                  Secondary Action
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Embedded Dashboard */}
      <ModernAnalyticsDashboard />
    </div>
  );
};

export default AnalyticsDemo;
