/**
 * Channels Page
 * Manage messaging channel connections
 */
import { useEffect } from 'react';
import { Plus, Radio, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useChannelsStore } from '@/stores/channels';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CHANNEL_ICONS, CHANNEL_NAMES, type ChannelType } from '@/types/channel';

export function Channels() {
  const { channels, loading, error, fetchChannels, connectChannel, disconnectChannel } = useChannelsStore();
  
  // Fetch channels on mount
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);
  
  // Supported channel types for adding
  const supportedTypes: ChannelType[] = ['whatsapp', 'telegram', 'discord', 'slack'];
  
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Channels</h1>
          <p className="text-muted-foreground">
            Connect and manage your messaging channels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchChannels}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-destructive">
            {error}
          </CardContent>
        </Card>
      )}
      
      {/* Channels Grid */}
      {channels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No channels configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Connect a messaging channel to start using ClawX
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Channel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {CHANNEL_ICONS[channel.type]}
                    </span>
                    <div>
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                      <CardDescription>
                        {CHANNEL_NAMES[channel.type]}
                      </CardDescription>
                    </div>
                  </div>
                  <StatusBadge status={channel.status} />
                </div>
              </CardHeader>
              <CardContent>
                {channel.lastActivity && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Last activity: {new Date(channel.lastActivity).toLocaleString()}
                  </p>
                )}
                {channel.error && (
                  <p className="text-sm text-destructive mb-4">{channel.error}</p>
                )}
                <div className="flex gap-2">
                  {channel.status === 'connected' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectChannel(channel.id)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => connectChannel(channel.id)}
                      disabled={channel.status === 'connecting'}
                    >
                      {channel.status === 'connecting' ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Add Channel Types */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Channels</CardTitle>
          <CardDescription>
            Click on a channel type to add it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {supportedTypes.map((type) => (
              <Button
                key={type}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
              >
                <span className="text-3xl">{CHANNEL_ICONS[type]}</span>
                <span>{CHANNEL_NAMES[type]}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Channels;
