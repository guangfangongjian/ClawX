/**
 * Skills Page
 * Browse and manage AI skills
 */
import { useEffect, useState } from 'react';
import { Search, Puzzle, RefreshCw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useSkillsStore } from '@/stores/skills';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/lib/utils';
import type { SkillCategory } from '@/types/skill';

const categoryLabels: Record<SkillCategory, string> = {
  productivity: 'Productivity',
  developer: 'Developer',
  'smart-home': 'Smart Home',
  media: 'Media',
  communication: 'Communication',
  security: 'Security',
  information: 'Information',
  utility: 'Utility',
  custom: 'Custom',
};

export function Skills() {
  const { skills, loading, error, fetchSkills, enableSkill, disableSkill } = useSkillsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');
  
  // Fetch skills on mount
  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);
  
  // Filter skills
  const filteredSkills = skills.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  // Get unique categories
  const categories = Array.from(new Set(skills.map((s) => s.category)));
  
  // Handle toggle
  const handleToggle = async (skillId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await disableSkill(skillId);
      } else {
        await enableSkill(skillId);
      }
    } catch (error) {
      // Error handled in store
    }
  };
  
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
          <h1 className="text-2xl font-bold">Skills</h1>
          <p className="text-muted-foreground">
            Browse and manage AI skills
          </p>
        </div>
        <Button variant="outline" onClick={fetchSkills}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {categoryLabels[category]}
            </Button>
          ))}
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
      
      {/* Skills Grid */}
      {filteredSkills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Puzzle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No skills found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'No skills available'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill) => (
            <Card key={skill.id} className={cn(skill.enabled && 'border-primary/50')}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{skill.icon || '🔧'}</span>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {skill.name}
                        {skill.isCore && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {categoryLabels[skill.category]}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={skill.enabled}
                    onCheckedChange={() => handleToggle(skill.id, skill.enabled)}
                    disabled={skill.isCore}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {skill.description}
                </p>
                {skill.version && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    v{skill.version}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Statistics */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {skills.filter((s) => s.enabled).length} of {skills.length} skills enabled
            </span>
            <span className="text-muted-foreground">
              {skills.filter((s) => s.isCore).length} core skills
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Skills;
