/**
 * Setup Wizard Page
 * First-time setup experience for new users
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SetupStep {
  id: string;
  title: string;
  description: string;
}

const steps: SetupStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to ClawX',
    description: 'Your AI assistant is ready to be configured',
  },
  {
    id: 'runtime',
    title: 'Environment Check',
    description: 'Verifying system requirements',
  },
  {
    id: 'provider',
    title: 'AI Provider',
    description: 'Configure your AI service',
  },
  {
    id: 'channel',
    title: 'Connect Channel',
    description: 'Link a messaging app',
  },
  {
    id: 'skills',
    title: 'Choose Skills',
    description: 'Select your skill bundles',
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'ClawX is ready to use',
  },
];

export function Setup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  
  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  
  const handleNext = () => {
    if (isLastStep) {
      // Complete setup and go to dashboard
      navigate('/');
    } else {
      setCurrentStep((i) => i + 1);
    }
  };
  
  const handleBack = () => {
    setCurrentStep((i) => Math.max(i - 1, 0));
  };
  
  const handleSkip = () => {
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Progress Indicator */}
      <div className="flex justify-center pt-8">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                  i < currentStep
                    ? 'border-primary bg-primary text-primary-foreground'
                    : i === currentStep
                    ? 'border-primary text-primary'
                    : 'border-slate-600 text-slate-600'
                )}
              >
                {i < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm">{i + 1}</span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-8 transition-colors',
                    i < currentStep ? 'bg-primary' : 'bg-slate-600'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="mx-auto max-w-2xl p-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{step.title}</h1>
            <p className="text-slate-400">{step.description}</p>
          </div>
          
          {/* Step-specific content */}
          <div className="rounded-xl bg-white/10 backdrop-blur p-8 mb-8">
            {currentStep === 0 && <WelcomeContent />}
            {currentStep === 1 && <RuntimeContent />}
            {currentStep === 2 && <ProviderContent />}
            {currentStep === 3 && <ChannelContent />}
            {currentStep === 4 && <SkillsContent />}
            {currentStep === 5 && <CompleteContent />}
          </div>
          
          {/* Navigation */}
          <div className="flex justify-between">
            <div>
              {!isFirstStep && (
                <Button variant="ghost" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {!isLastStep && (
                <Button variant="ghost" onClick={handleSkip}>
                  Skip Setup
                </Button>
              )}
              <Button onClick={handleNext}>
                {isLastStep ? (
                  'Get Started'
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Step content components (simplified versions)
function WelcomeContent() {
  return (
    <div className="text-center space-y-4">
      <div className="text-6xl mb-4">🤖</div>
      <h2 className="text-xl font-semibold">Welcome to ClawX</h2>
      <p className="text-slate-300">
        ClawX is a graphical interface for OpenClaw, making it easy to use AI
        assistants across your favorite messaging platforms.
      </p>
      <ul className="text-left space-y-2 text-slate-300">
        <li>✅ Zero command-line required</li>
        <li>✅ Modern, beautiful interface</li>
        <li>✅ Pre-installed skill bundles</li>
        <li>✅ Cross-platform support</li>
      </ul>
    </div>
  );
}

function RuntimeContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Checking Environment</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
          <span>Node.js Runtime</span>
          <span className="text-green-400">✓ Installed</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
          <span>OpenClaw Package</span>
          <span className="text-green-400">✓ Ready</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
          <span>Gateway Service</span>
          <span className="text-green-400">✓ Running</span>
        </div>
      </div>
    </div>
  );
}

function ProviderContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Select AI Provider</h2>
      <p className="text-slate-300">
        Choose your preferred AI model provider
      </p>
      <div className="grid grid-cols-3 gap-4">
        {[
          { id: 'anthropic', name: 'Anthropic', model: 'Claude', icon: '🤖' },
          { id: 'openai', name: 'OpenAI', model: 'GPT-4', icon: '💚' },
          { id: 'google', name: 'Google', model: 'Gemini', icon: '🔷' },
        ].map((provider) => (
          <button
            key={provider.id}
            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center"
          >
            <span className="text-3xl">{provider.icon}</span>
            <p className="font-medium mt-2">{provider.name}</p>
            <p className="text-sm text-slate-400">{provider.model}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChannelContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Connect a Channel</h2>
      <p className="text-slate-300">
        Link a messaging app to start chatting with your AI
      </p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { type: 'whatsapp', name: 'WhatsApp', icon: '📱' },
          { type: 'telegram', name: 'Telegram', icon: '✈️' },
          { type: 'discord', name: 'Discord', icon: '🎮' },
          { type: 'slack', name: 'Slack', icon: '💼' },
        ].map((channel) => (
          <button
            key={channel.type}
            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-3"
          >
            <span className="text-2xl">{channel.icon}</span>
            <span className="font-medium">{channel.name}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-400 text-center">
        You can add more channels later in Settings
      </p>
    </div>
  );
}

function SkillsContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Choose Skill Bundles</h2>
      <p className="text-slate-300">
        Select pre-configured skill packages
      </p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'productivity', name: 'Productivity', icon: '📋', recommended: true },
          { id: 'developer', name: 'Developer', icon: '💻', recommended: true },
          { id: 'smart-home', name: 'Smart Home', icon: '🏠' },
          { id: 'media', name: 'Media', icon: '🎨' },
        ].map((bundle) => (
          <button
            key={bundle.id}
            className={cn(
              'p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left relative',
              bundle.recommended && 'ring-2 ring-primary'
            )}
          >
            <span className="text-2xl">{bundle.icon}</span>
            <p className="font-medium mt-2">{bundle.name}</p>
            {bundle.recommended && (
              <span className="absolute top-2 right-2 text-xs bg-primary px-2 py-0.5 rounded">
                Recommended
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function CompleteContent() {
  return (
    <div className="text-center space-y-4">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-xl font-semibold">Setup Complete!</h2>
      <p className="text-slate-300">
        ClawX is configured and ready to use. You can now start chatting with
        your AI assistant.
      </p>
      <div className="space-y-2 text-slate-300">
        <p>✅ AI Provider configured</p>
        <p>✅ Channel connected</p>
        <p>✅ Skills enabled</p>
        <p>✅ Gateway running</p>
      </div>
    </div>
  );
}

export default Setup;
