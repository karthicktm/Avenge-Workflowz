'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WorkflowBuilderChat } from '@/components/workflow-builder/WorkflowBuilderChat';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare, Sparkles, Zap, Brain, Globe } from 'lucide-react';

export default function BuilderPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-6 h-full flex flex-col">
        {!isChatOpen ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">Workflow Builder</h1>
              <p className="text-muted-foreground mt-1">
                Describe your workflow in plain English and let AI build it for you.
              </p>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-3xl w-full space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="p-6 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full">
                    <Sparkles className="w-16 h-16 text-primary" />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-2">Build Workflows with AI</h2>
                  <p className="text-muted-foreground">
                    Tell me what you want to automate, and I&apos;ll help you build a workflow.
                    I can connect to 140+ services across 16 categories.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-amber-600/20 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 text-left">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500" />
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                          <Zap className="h-4 w-4 text-white" />
                        </div>
                        <CardTitle className="card-title">Example Workflows</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm text-muted-foreground space-y-1.5">
                        <li>• Search Twitter and reply with AI</li>
                        <li>• Monitor RSS feed and post to Slack</li>
                        <li>• Generate weekly reports from Google Sheets</li>
                        <li>• Auto-respond to Discord messages</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-blue-600/20 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 text-left">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" />
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500">
                          <Globe className="h-4 w-4 text-white" />
                        </div>
                        <CardTitle className="card-title">Available Integrations</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm text-muted-foreground space-y-1.5">
                        <li>• <strong>AI:</strong> OpenAI, Anthropic, Replicate, Hugging Face</li>
                        <li>• <strong>Social:</strong> Twitter, Reddit, LinkedIn, YouTube</li>
                        <li>• <strong>Data:</strong> Google Sheets, Airtable, Notion</li>
                        <li>• <strong>Communication:</strong> Slack, Discord, Email, Telegram</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4 pt-2">
                  <Button
                    onClick={() => setIsChatOpen(true)}
                    size="lg"
                    className="gap-2 text-lg px-8 py-6"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Start Building with AI
                  </Button>

                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      <span>Powered by OpenAI, Anthropic & Z.AI</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    💡 Tip: Be specific about what you want to automate. For example:
                    &quot;Create a workflow that monitors my Twitter mentions every hour and replies
                    using GPT-4 to generate helpful responses.&quot;
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
