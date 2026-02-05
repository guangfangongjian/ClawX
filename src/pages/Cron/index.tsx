/**
 * Cron Page
 * Manage scheduled tasks
 */
import { useEffect, useState } from 'react';
import { Plus, Clock, Play, Pause, Trash2, Edit, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useCronStore } from '@/stores/cron';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatRelativeTime } from '@/lib/utils';
import type { CronJob } from '@/types/cron';

export function Cron() {
  const { jobs, loading, error, fetchJobs, toggleJob, deleteJob, triggerJob } = useCronStore();
  
  // Fetch jobs on mount
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);
  
  // Statistics
  const activeJobs = jobs.filter((j) => j.enabled);
  const pausedJobs = jobs.filter((j) => !j.enabled);
  
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
          <h1 className="text-2xl font-bold">Cron Tasks</h1>
          <p className="text-muted-foreground">
            Schedule automated AI tasks
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchJobs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{jobs.length}</p>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                <Play className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeJobs.length}</p>
                <p className="text-sm text-muted-foreground">Running</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900">
                <Pause className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pausedJobs.length}</p>
                <p className="text-sm text-muted-foreground">Paused</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-destructive">
            {error}
          </CardContent>
        </Card>
      )}
      
      {/* Jobs List */}
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No scheduled tasks</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first scheduled task to automate AI workflows
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <CronJobCard
              key={job.id}
              job={job}
              onToggle={(enabled) => toggleJob(job.id, enabled)}
              onDelete={() => deleteJob(job.id)}
              onTrigger={() => triggerJob(job.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CronJobCardProps {
  job: CronJob;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  onTrigger: () => void;
}

function CronJobCard({ job, onToggle, onDelete, onTrigger }: CronJobCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <CardTitle className="text-lg">{job.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {job.schedule}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={job.enabled ? 'success' : 'secondary'}>
              {job.enabled ? 'Active' : 'Paused'}
            </Badge>
            <Switch
              checked={job.enabled}
              onCheckedChange={onToggle}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {job.message}
        </p>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              Target: {job.target.channelName}
            </span>
            {job.lastRun && (
              <span>
                Last run: {formatRelativeTime(job.lastRun.time)}
                {job.lastRun.success ? ' ✓' : ' ✗'}
              </span>
            )}
            {job.nextRun && (
              <span>
                Next: {new Date(job.nextRun).toLocaleString()}
              </span>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onTrigger}>
              <Play className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Cron;
