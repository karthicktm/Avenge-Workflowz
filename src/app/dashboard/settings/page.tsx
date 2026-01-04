'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trash2, Plus, Key, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import useSWR from 'swr';

interface AIKey {
  id: string;
  provider: string;
  label: string;
  isActive: number;
  createdAt: string;
  lastUsed: string | null;
  usageCount: number;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

export default function SettingsPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState({
    provider: 'openai' as 'openai' | 'anthropic' | 'zai',
    key: '',
    label: '',
  });

  const { data, isLoading, mutate } = useSWR<{ keys: AIKey[] }>(
    '/api/settings/ai-keys',
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    }
  );

  const keys = data?.keys || [];

  const handleAddKey = async () => {
    if (!newKey.key.trim()) {
      toast.error('API key is required');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/settings/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey),
      });

      if (response.ok) {
        toast.success('API key added successfully');
        setNewKey({ provider: 'openai', key: '', label: '' });
        setShowAddDialog(false);
        await mutate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add key');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to add key');
      toast.error('Failed to add key');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const response = await fetch(`/api/settings/ai-keys?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('API key deleted');
        await mutate();
      } else {
        toast.error('Failed to delete key');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to delete key');
      toast.error('Failed to delete key');
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Anthropic';
      case 'zai': return 'Z.AI (GLM)';
      default: return provider;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your API keys and preferences</p>
        </div>

        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              AI API Keys
            </CardTitle>
            <CardDescription>
              Add your own API keys for unlimited usage. Without your own keys, you&apos;ll use
              platform keys with rate limiting (50 requests/hour per provider).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Key Button */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add API Key</DialogTitle>
                  <DialogDescription>
                    Add your own AI provider API key for unlimited usage
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={newKey.provider}
                      onValueChange={(v: typeof newKey.provider) =>
                        setNewKey({ ...newKey, provider: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="zai">Z.AI (GLM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Label (Optional)</Label>
                    <Input
                      value={newKey.label}
                      onChange={e => setNewKey({ ...newKey, label: e.target.value })}
                      placeholder="My OpenAI Key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={newKey.key}
                      onChange={e => setNewKey({ ...newKey, key: e.target.value })}
                      placeholder={
                        newKey.provider === 'openai'
                          ? 'sk-...'
                          : newKey.provider === 'anthropic'
                          ? 'sk-ant-...'
                          : 'API key'
                      }
                    />
                  </div>

                  <Button onClick={handleAddKey} disabled={adding} className="w-full">
                    {adding ? 'Adding...' : 'Add API Key'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Existing Keys */}
            <div className="space-y-3">
              <h3 className="font-medium">Your API Keys</h3>

              {isLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : keys.length === 0 ? (
                <div className="border border-dashed rounded-lg p-6 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    No API keys added yet. Add one above to enable unlimited usage.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {keys.map(key => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{key.label}</p>
                        <p className="text-sm text-gray-600">
                          {getProviderLabel(key.provider)} • Used {key.usageCount} times
                          {key.lastUsed && ` • Last used ${new Date(key.lastUsed).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteKey(key.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Platform Rate Limits Info */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Rate Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              When using platform API keys (no user key added), the following limits apply:
            </p>
            <ul className="text-sm space-y-2">
              <li>• OpenAI: 50 requests per hour</li>
              <li>• Anthropic: 50 requests per hour</li>
              <li>• Z.AI: 50 requests per hour</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">
              Add your own API keys above for unlimited usage.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
