'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WorkflowBuilderChat } from '@/components/workflow-builder/WorkflowBuilderChat';
import { Button } from '@/components/ui/button';
import { MessageSquare, Sparkles, Zap, Brain, Globe } from 'lucide-react';

export default function BuilderPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-6 h-full flex flex-col">
        {!isChatOpen ? (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Workflow Builder</h1>
              <p className="text-gray-600 mt-2">
                Describe your workflow in plain English and let AI build it for you.
              </p>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-3xl w-full space-y-8 text-center">
                <div className="flex justify-center">
                  <div className="p-6 bg-primary/10 rounded-full">
                    <Sparkles className="w-16 h-16 text-primary" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-3">Build Workflows with AI</h2>
                  <p className="text-gray-600 text-lg">
                    Tell me what you want to automate, and I'll help you build a workflow.
                    I can connect to 140+ services across 16 categories.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 border rounded-lg text-left bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <Zap className="w-6 h-6 text-primary" />
                      <h3 className="font-semibold text-lg">Example Workflows</h3>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• Search Twitter and reply with AI</li>
                      <li>• Monitor RSS feed and post to Slack</li>
                      <li>• Generate weekly reports from Google Sheets</li>
                      <li>• Auto-respond to Discord messages</li>
                    </ul>
                  </div>

                  <div className="p-6 border rounded-lg text-left bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <Globe className="w-6 h-6 text-primary" />
                      <h3 className="font-semibold text-lg">Available Integrations</h3>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• <strong>AI:</strong> OpenAI, Anthropic, Replicate, Hugging Face</li>
                      <li>• <strong>Social:</strong> Twitter, Reddit, LinkedIn, YouTube</li>
                      <li>• <strong>Data:</strong> Google Sheets, Airtable, Notion</li>
                      <li>• <strong>Communication:</strong> Slack, Discord, Email, Telegram</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={() => setIsChatOpen(true)}
                    size="lg"
                    className="gap-2 text-lg px-8 py-6"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Start Building with AI
                  </Button>

                  <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      <span>Powered by OpenAI, Anthropic & Z.AI</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <p className="text-xs text-gray-500">
                    💡 Tip: Be specific about what you want to automate. For example:
                    "Create a workflow that monitors my Twitter mentions every hour and replies
                    using GPT-4 to generate helpful responses."
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <WorkflowBuilderChat onClose={() => setIsChatOpen(false)} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
