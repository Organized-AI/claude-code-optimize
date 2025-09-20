# API Configuration Interface Documentation

## Overview

This guide provides comprehensive documentation for the API configuration interface design in the moonlock-dashboard. The system supports multi-provider architecture with intelligent routing, real-time monitoring, and advanced configuration management for Claude, OpenRouter, and other AI providers.

## Table of Contents

1. [Configuration Architecture](#configuration-architecture)
2. [Multi-Provider Setup](#multi-provider-setup)
3. [Interface Design Patterns](#interface-design-patterns)
4. [Configuration Management](#configuration-management)
5. [Real-time Monitoring](#real-time-monitoring)
6. [Security & Access Control](#security--access-control)
7. [Implementation Examples](#implementation-examples)
8. [Best Practices](#best-practices)

---

## Configuration Architecture

### Core Configuration Schema

The API configuration interface follows a hierarchical structure supporting multiple providers with unified management:

```typescript
interface APIConfiguration {
  providers: ProviderConfig[];
  router: RouterConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
  defaults: DefaultConfig;
  metadata: ConfigMetadata;
}

interface ProviderConfig {
  id: string;
  name: string;
  type: 'anthropic' | 'openrouter' | 'openai' | 'custom';
  enabled: boolean;
  priority: number;
  
  // Connection settings
  connection: {
    apiBaseUrl: string;
    apiKey: string;
    timeout: number;
    retryPolicy: RetryPolicy;
  };
  
  // Model configuration
  models: ModelConfig[];
  defaultModel: string;
  
  // Rate limiting
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerDay: number;
    concurrentRequests: number;
  };
  
  // Cost management
  billing: {
    currency: 'USD' | 'EUR' | 'GBP';
    budgetLimits: BudgetLimits;
    costTracking: boolean;
    alertThresholds: AlertThresholds;
  };
  
  // Feature flags
  features: {
    streaming: boolean;
    caching: boolean;
    functionCalling: boolean;
    imageProcessing: boolean;
    fileUploads: boolean;
  };
  
  // Health monitoring
  healthCheck: {
    enabled: boolean;
    interval: number;
    endpoint?: string;
    timeout: number;
  };
}

interface ModelConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  
  // Capabilities
  capabilities: {
    maxTokens: number;
    contextWindow: number;
    supportsFunctions: boolean;
    supportsImages: boolean;
    supportsStreaming: boolean;
  };
  
  // Pricing
  pricing: {
    inputTokens: number;  // per 1M tokens
    outputTokens: number; // per 1M tokens
    imageProcessing?: number;
    functionCalls?: number;
  };
  
  // Performance characteristics
  performance: {
    avgLatency: number;
    throughput: number;
    reliability: number;
  };
  
  // Usage patterns
  usagePatterns: {
    recommendedFor: string[];
    optimalContextSize: number;
    costEfficiencyRating: number;
    qualityRating: number;
  };
}
```

### Configuration Interface Components

```typescript
// Main configuration interface component
interface ConfigurationInterfaceProps {
  configuration: APIConfiguration;
  onConfigurationChange: (config: APIConfiguration) => void;
  readOnly?: boolean;
  validationErrors?: ValidationError[];
}

export const APIConfigurationInterface: React.FC<ConfigurationInterfaceProps> = ({
  configuration,
  onConfigurationChange,
  readOnly = false,
  validationErrors = []
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'routing' | 'monitoring' | 'security'>('providers');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());

  const handleProviderTest = useCallback(async (providerId: string) => {
    try {
      const result = await testProviderConnection(providerId);
      setTestResults(prev => new Map(prev).set(providerId, result));
    } catch (error) {
      setTestResults(prev => new Map(prev).set(providerId, {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      }));
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-dark-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-dark-700">
        <div>
          <h1 className="text-2xl font-bold text-white">API Configuration</h1>
          <p className="text-dark-400 mt-1">Manage AI provider settings and routing</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <ConfigurationStatus configuration={configuration} />
          {!readOnly && (
            <>
              <button
                onClick={() => validateConfiguration(configuration)}
                className="px-4 py-2 bg-moonlock-600 text-white rounded-lg hover:bg-moonlock-700 transition-colors"
              >
                Validate Config
              </button>
              <button
                onClick={() => saveConfiguration(configuration)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-dark-700">
        {[
          { id: 'providers', label: 'Providers', icon: '🔗' },
          { id: 'routing', label: 'Routing', icon: '🎯' },
          { id: 'monitoring', label: 'Monitoring', icon: '📊' },
          { id: 'security', label: 'Security', icon: '🔒' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-moonlock-400 border-moonlock-400'
                : 'text-dark-400 border-transparent hover:text-dark-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'providers' && (
          <ProvidersConfiguration
            providers={configuration.providers}
            onProvidersChange={(providers) => 
              onConfigurationChange({ ...configuration, providers })
            }
            onProviderTest={handleProviderTest}
            testResults={testResults}
            readOnly={readOnly}
          />
        )}
        
        {activeTab === 'routing' && (
          <RoutingConfiguration
            router={configuration.router}
            providers={configuration.providers}
            onRouterChange={(router) => 
              onConfigurationChange({ ...configuration, router })
            }
            readOnly={readOnly}
          />
        )}
        
        {activeTab === 'monitoring' && (
          <MonitoringConfiguration
            monitoring={configuration.monitoring}
            onMonitoringChange={(monitoring) => 
              onConfigurationChange({ ...configuration, monitoring })
            }
            readOnly={readOnly}
          />
        )}
        
        {activeTab === 'security' && (
          <SecurityConfiguration
            security={configuration.security}
            onSecurityChange={(security) => 
              onConfigurationChange({ ...configuration, security })
            }
            readOnly={readOnly}
          />
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <ValidationErrorsPanel errors={validationErrors} />
      )}
    </div>
  );
};
```

---

## Multi-Provider Setup

### Provider Configuration Interface

```typescript
interface ProvidersConfigurationProps {
  providers: ProviderConfig[];
  onProvidersChange: (providers: ProviderConfig[]) => void;
  onProviderTest: (providerId: string) => void;
  testResults: Map<string, TestResult>;
  readOnly: boolean;
}

const ProvidersConfiguration: React.FC<ProvidersConfigurationProps> = ({
  providers,
  onProvidersChange,
  onProviderTest,
  testResults,
  readOnly
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);

  const handleAddProvider = (type: ProviderConfig['type']) => {
    const newProvider: ProviderConfig = {
      id: `${type}-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Provider`,
      type,
      enabled: false,
      priority: providers.length + 1,
      connection: {
        apiBaseUrl: getDefaultBaseUrl(type),
        apiKey: '',
        timeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          baseDelay: 1000
        }
      },
      models: getDefaultModels(type),
      defaultModel: getDefaultModels(type)[0]?.id || '',
      rateLimits: getDefaultRateLimits(type),
      billing: getDefaultBilling(),
      features: getDefaultFeatures(type),
      healthCheck: {
        enabled: true,
        interval: 300000, // 5 minutes
        timeout: 10000
      }
    };

    onProvidersChange([...providers, newProvider]);
    setSelectedProvider(newProvider.id);
    setShowAddProvider(false);
  };

  return (
    <div className="flex h-full">
      {/* Provider List Sidebar */}
      <div className="w-80 border-r border-dark-700 bg-dark-800">
        <div className="p-4 border-b border-dark-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Providers</h3>
            {!readOnly && (
              <button
                onClick={() => setShowAddProvider(true)}
                className="p-2 text-moonlock-400 hover:bg-moonlock-500/20 rounded-lg transition-colors"
                title="Add Provider"
              >
                ➕
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto">
          {providers.map(provider => (
            <ProviderListItem
              key={provider.id}
              provider={provider}
              isSelected={selectedProvider === provider.id}
              testResult={testResults.get(provider.id)}
              onClick={() => setSelectedProvider(provider.id)}
              onTest={() => onProviderTest(provider.id)}
              onToggle={(enabled) => {
                const updated = providers.map(p => 
                  p.id === provider.id ? { ...p, enabled } : p
                );
                onProvidersChange(updated);
              }}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>

      {/* Provider Configuration Panel */}
      <div className="flex-1 overflow-y-auto">
        {selectedProvider ? (
          <ProviderDetailPanel
            provider={providers.find(p => p.id === selectedProvider)!}
            onChange={(updated) => {
              const newProviders = providers.map(p => 
                p.id === selectedProvider ? updated : p
              );
              onProvidersChange(newProviders);
            }}
            onDelete={() => {
              const filtered = providers.filter(p => p.id !== selectedProvider);
              onProvidersChange(filtered);
              setSelectedProvider(null);
            }}
            readOnly={readOnly}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-dark-400">
              <div className="text-4xl mb-4">🔗</div>
              <p>Select a provider to configure</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Provider Modal */}
      {showAddProvider && (
        <AddProviderModal
          onSelect={handleAddProvider}
          onClose={() => setShowAddProvider(false)}
        />
      )}
    </div>
  );
};

// Provider list item component
const ProviderListItem: React.FC<{
  provider: ProviderConfig;
  isSelected: boolean;
  testResult?: TestResult;
  onClick: () => void;
  onTest: () => void;
  onToggle: (enabled: boolean) => void;
  readOnly: boolean;
}> = ({ provider, isSelected, testResult, onClick, onTest, onToggle, readOnly }) => {
  const getStatusIcon = () => {
    if (!provider.enabled) return '⚫';
    if (!testResult) return '❓';
    return testResult.success ? '✅' : '❌';
  };

  const getStatusColor = () => {
    if (!provider.enabled) return 'text-gray-500';
    if (!testResult) return 'text-yellow-500';
    return testResult.success ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div
      className={`p-4 border-b border-dark-700 cursor-pointer transition-colors ${
        isSelected ? 'bg-moonlock-500/20' : 'hover:bg-dark-700'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <span className={`text-lg ${getStatusColor()}`}>
            {getStatusIcon()}
          </span>
          <div>
            <h4 className="text-white font-medium">{provider.name}</h4>
            <p className="text-dark-400 text-sm capitalize">{provider.type}</p>
          </div>
        </div>
        
        {!readOnly && (
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTest();
              }}
              className="p-1 text-dark-400 hover:text-moonlock-400 transition-colors"
              title="Test Connection"
            >
              🧪
            </button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={provider.enabled}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggle(e.target.checked);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-moonlock-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-moonlock-600"></div>
            </label>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-dark-400">
          {provider.models.length} models
        </span>
        <span className={`text-xs px-2 py-1 rounded ${
          provider.priority === 1 
            ? 'bg-yellow-500/20 text-yellow-400' 
            : 'bg-dark-600 text-dark-300'
        }`}>
          Priority {provider.priority}
        </span>
      </div>

      {testResult && !testResult.success && (
        <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs">
          {testResult.error}
        </div>
      )}
    </div>
  );
};
```

### Provider Detail Configuration

```typescript
const ProviderDetailPanel: React.FC<{
  provider: ProviderConfig;
  onChange: (provider: ProviderConfig) => void;
  onDelete: () => void;
  readOnly: boolean;
}> = ({ provider, onChange, onDelete, readOnly }) => {
  const [activeSection, setActiveSection] = useState<'connection' | 'models' | 'limits' | 'billing' | 'features'>('connection');

  const updateProvider = (updates: Partial<ProviderConfig>) => {
    onChange({ ...provider, ...updates });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">{provider.name}</h2>
          <p className="text-dark-400 capitalize">{provider.type} Provider</p>
        </div>
        
        {!readOnly && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => testProviderConnection(provider.id)}
              className="px-4 py-2 bg-moonlock-600 text-white rounded-lg hover:bg-moonlock-700 transition-colors"
            >
              Test Connection
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Provider
            </button>
          </div>
        )}
      </div>

      {/* Section Navigation */}
      <div className="flex space-x-1 mb-6 bg-dark-800 rounded-lg p-1">
        {[
          { id: 'connection', label: 'Connection', icon: '🔗' },
          { id: 'models', label: 'Models', icon: '🤖' },
          { id: 'limits', label: 'Rate Limits', icon: '⏱️' },
          { id: 'billing', label: 'Billing', icon: '💰' },
          { id: 'features', label: 'Features', icon: '⚡' }
        ].map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === section.id
                ? 'bg-moonlock-600 text-white'
                : 'text-dark-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="space-y-6">
        {activeSection === 'connection' && (
          <ConnectionConfiguration
            connection={provider.connection}
            onChange={(connection) => updateProvider({ connection })}
            readOnly={readOnly}
          />
        )}
        
        {activeSection === 'models' && (
          <ModelsConfiguration
            models={provider.models}
            defaultModel={provider.defaultModel}
            onChange={(models, defaultModel) => updateProvider({ models, defaultModel })}
            readOnly={readOnly}
          />
        )}
        
        {activeSection === 'limits' && (
          <RateLimitsConfiguration
            rateLimits={provider.rateLimits}
            onChange={(rateLimits) => updateProvider({ rateLimits })}
            readOnly={readOnly}
          />
        )}
        
        {activeSection === 'billing' && (
          <BillingConfiguration
            billing={provider.billing}
            onChange={(billing) => updateProvider({ billing })}
            readOnly={readOnly}
          />
        )}
        
        {activeSection === 'features' && (
          <FeaturesConfiguration
            features={provider.features}
            onChange={(features) => updateProvider({ features })}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
};

// Connection configuration component
const ConnectionConfiguration: React.FC<{
  connection: ProviderConfig['connection'];
  onChange: (connection: ProviderConfig['connection']) => void;
  readOnly: boolean;
}> = ({ connection, onChange, readOnly }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-dark-300 mb-2">
          API Base URL
        </label>
        <input
          type="url"
          value={connection.apiBaseUrl}
          onChange={(e) => onChange({ ...connection, apiBaseUrl: e.target.value })}
          readOnly={readOnly}
          className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-white focus:border-moonlock-500 focus:outline-none"
          placeholder="https://api.example.com/v1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-300 mb-2">
          API Key
        </label>
        <div className="relative">
          <input
            type="password"
            value={connection.apiKey}
            onChange={(e) => onChange({ ...connection, apiKey: e.target.value })}
            readOnly={readOnly}
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-white focus:border-moonlock-500 focus:outline-none pr-20"
            placeholder="sk-..."
          />
          <APIKeyValidator apiKey={connection.apiKey} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Timeout (ms)
          </label>
          <input
            type="number"
            value={connection.timeout}
            onChange={(e) => onChange({ ...connection, timeout: Number(e.target.value) })}
            readOnly={readOnly}
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-white focus:border-moonlock-500 focus:outline-none"
            min="1000"
            max="300000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Max Retries
          </label>
          <input
            type="number"
            value={connection.retryPolicy.maxRetries}
            onChange={(e) => onChange({ 
              ...connection, 
              retryPolicy: { 
                ...connection.retryPolicy, 
                maxRetries: Number(e.target.value) 
              }
            })}
            readOnly={readOnly}
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-white focus:border-moonlock-500 focus:outline-none"
            min="0"
            max="10"
          />
        </div>
      </div>
    </div>
  );
};
```

---

## Interface Design Patterns

### Unified Component Library

```typescript
// Base input component with validation
interface FormInputProps {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number' | 'password' | 'url' | 'email';
  placeholder?: string;
  help?: string;
  error?: string;
  required?: boolean;
  readOnly?: boolean;
  validator?: (value: string | number) => string | null;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  help,
  error,
  required,
  readOnly,
  validator
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' ? Number(e.target.value) : e.target.value;
    onChange(newValue);
    
    if (validator) {
      const error = validator(newValue);
      setValidationError(error);
    }
  };

  const displayError = error || validationError;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-dark-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full bg-dark-800 border rounded-lg px-4 py-2 text-white focus:outline-none transition-colors ${
          displayError
            ? 'border-red-500 focus:border-red-400'
            : 'border-dark-600 focus:border-moonlock-500'
        } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
      
      {help && !displayError && (
        <p className="text-sm text-dark-400">{help}</p>
      )}
      
      {displayError && (
        <p className="text-sm text-red-400">{displayError}</p>
      )}
    </div>
  );
};

// Advanced toggle component
interface ToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Toggle: React.FC<ToggleProps> = ({
  label,
  description,
  enabled,
  onChange,
  disabled = false,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-8 h-5',
    md: 'w-11 h-6',
    lg: 'w-14 h-8'
  };

  const dotSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7'
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-white">{label}</h4>
        {description && (
          <p className="text-sm text-dark-400 mt-1">{description}</p>
        )}
      </div>
      
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className={`${sizeClasses[size]} bg-dark-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-moonlock-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full ${dotSizeClasses[size]} after:transition-all peer-checked:bg-moonlock-600 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
      </label>
    </div>
  );
};

// Configuration section wrapper
interface ConfigSectionProps {
  title: string;
  description?: string;
  icon?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({
  title,
  description,
  icon,
  children,
  collapsible = false,
  defaultExpanded = true
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-dark-800 rounded-lg border border-dark-700">
      <div 
        className={`p-4 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={collapsible ? () => setExpanded(!expanded) : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && <span className="text-xl">{icon}</span>}
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              {description && (
                <p className="text-dark-400 text-sm mt-1">{description}</p>
              )}
            </div>
          </div>
          
          {collapsible && (
            <button className="text-dark-400 hover:text-white transition-colors">
              {expanded ? '−' : '+'}
            </button>
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="px-4 pb-4 border-t border-dark-700">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
```

### Real-time Status Components

```typescript
// Provider status indicator
interface ProviderStatusProps {
  provider: ProviderConfig;
  healthStatus?: HealthStatus;
  usage?: UsageMetrics;
}

const ProviderStatus: React.FC<ProviderStatusProps> = ({
  provider,
  healthStatus,
  usage
}) => {
  const getStatusColor = () => {
    if (!provider.enabled) return 'bg-gray-500';
    if (!healthStatus) return 'bg-yellow-500';
    
    switch (healthStatus.status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    if (!provider.enabled) return 'Disabled';
    if (!healthStatus) return 'Unknown';
    return healthStatus.status.charAt(0).toUpperCase() + healthStatus.status.slice(1);
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        {provider.enabled && healthStatus?.status === 'healthy' && (
          <div className={`absolute inset-0 w-3 h-3 rounded-full ${getStatusColor()} animate-ping opacity-75`} />
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium">{provider.name}</span>
          <span className="text-xs px-2 py-1 bg-dark-700 text-dark-300 rounded">
            {getStatusText()}
          </span>
        </div>
        
        {usage && (
          <div className="flex items-center space-x-4 text-xs text-dark-400 mt-1">
            <span>Requests: {usage.requests}/day</span>
            <span>Cost: ${usage.cost.toFixed(4)}</span>
            <span>Latency: {usage.avgLatency}ms</span>
          </div>
        )}
      </div>
      
      {healthStatus?.responseTime && (
        <div className="text-right">
          <div className="text-sm text-white">{healthStatus.responseTime}ms</div>
          <div className="text-xs text-dark-400">Response Time</div>
        </div>
      )}
    </div>
  );
};

// Real-time metrics dashboard
const MetricsDashboard: React.FC<{
  providers: ProviderConfig[];
  metrics: Map<string, ProviderMetrics>;
}> = ({ providers, metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers.filter(p => p.enabled).map(provider => {
        const providerMetrics = metrics.get(provider.id);
        
        return (
          <div key={provider.id} className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-white">{provider.name}</h4>
              <ProviderStatusBadge provider={provider} metrics={providerMetrics} />
            </div>
            
            <div className="space-y-2">
              <MetricItem
                label="Requests Today"
                value={providerMetrics?.requests || 0}
                limit={provider.rateLimits.requestsPerDay}
                format="number"
              />
              <MetricItem
                label="Cost Today"
                value={providerMetrics?.cost || 0}
                format="currency"
              />
              <MetricItem
                label="Avg Latency"
                value={providerMetrics?.avgLatency || 0}
                format="time"
              />
              <MetricItem
                label="Success Rate"
                value={providerMetrics?.successRate || 100}
                format="percentage"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MetricItem: React.FC<{
  label: string;
  value: number;
  limit?: number;
  format: 'number' | 'currency' | 'time' | 'percentage';
}> = ({ label, value, limit, format }) => {
  const formatValue = (val: number, fmt: string) => {
    switch (fmt) {
      case 'currency': return `$${val.toFixed(4)}`;
      case 'time': return `${val.toFixed(0)}ms`;
      case 'percentage': return `${val.toFixed(1)}%`;
      default: return val.toString();
    }
  };

  const getProgressColor = () => {
    if (!limit) return 'bg-moonlock-500';
    const percentage = (value / limit) * 100;
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-dark-400 text-sm">{label}</span>
      <div className="flex items-center space-x-2">
        <span className="text-white font-mono text-sm">
          {formatValue(value, format)}
        </span>
        {limit && (
          <>
            <span className="text-dark-400 text-sm">/ {formatValue(limit, format)}</span>
            <div className="w-16 h-1 bg-dark-600 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${Math.min(100, (value / limit) * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

---

## Configuration Management

### Configuration Validation System

```typescript
interface ValidationRule {
  field: string;
  validator: (value: any, context?: any) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  suggestions?: string[];
}

class ConfigurationValidator {
  private rules: ValidationRule[] = [
    // Provider validation rules
    {
      field: 'providers[].connection.apiKey',
      validator: (apiKey: string) => {
        if (!apiKey) {
          return { valid: false, message: 'API key is required' };
        }
        if (apiKey.length < 20) {
          return { valid: false, message: 'API key appears to be too short' };
        }
        return { valid: true };
      },
      severity: 'error'
    },
    
    {
      field: 'providers[].connection.apiBaseUrl',
      validator: (url: string) => {
        try {
          new URL(url);
          return { valid: true };
        } catch {
          return { 
            valid: false, 
            message: 'Invalid URL format',
            suggestions: ['Ensure URL includes protocol (https://)']
          };
        }
      },
      severity: 'error'
    },
    
    {
      field: 'providers[].rateLimits',
      validator: (limits: any) => {
        if (limits.requestsPerMinute <= 0) {
          return { valid: false, message: 'Requests per minute must be greater than 0' };
        }
        if (limits.requestsPerDay < limits.requestsPerMinute * 60) {
          return { 
            valid: false, 
            message: 'Daily limit should be at least 60x the per-minute limit',
            suggestions: ['Increase daily limit or decrease per-minute limit']
          };
        }
        return { valid: true };
      },
      severity: 'warning'
    },
    
    // Router validation rules
    {
      field: 'router.routes',
      validator: (routes: any, context: { providers: ProviderConfig[] }) => {
        const enabledProviders = context.providers.filter(p => p.enabled);
        const invalidRoutes = Object.entries(routes).filter(([_, route]) => {
          const [providerId] = (route as string).split(',');
          return !enabledProviders.find(p => p.id === providerId);
        });
        
        if (invalidRoutes.length > 0) {
          return {
            valid: false,
            message: `Routes reference disabled providers: ${invalidRoutes.map(([name]) => name).join(', ')}`,
            suggestions: ['Enable referenced providers or update routes']
          };
        }
        
        return { valid: true };
      },
      severity: 'error'
    }
  ];

  validate(configuration: APIConfiguration): ValidationError[] {
    const errors: ValidationError[] = [];
    
    this.rules.forEach(rule => {
      const result = this.validateField(rule, configuration);
      if (!result.valid) {
        errors.push({
          field: rule.field,
          message: result.message || 'Validation failed',
          severity: rule.severity,
          suggestions: result.suggestions
        });
      }
    });
    
    return errors;
  }
  
  private validateField(rule: ValidationRule, config: APIConfiguration): ValidationResult {
    // Extract field value using path notation
    const value = this.getFieldValue(rule.field, config);
    return rule.validator(value, config);
  }
  
  private getFieldValue(path: string, obj: any): any {
    return path.split('.').reduce((current, key) => {
      if (key.includes('[]')) {
        const arrayKey = key.replace('[]', '');
        return current[arrayKey] || [];
      }
      return current?.[key];
    }, obj);
  }
}

// Configuration import/export
class ConfigurationManager {
  async exportConfiguration(config: APIConfiguration): Promise<string> {
    // Sanitize sensitive data
    const sanitized = this.sanitizeForExport(config);
    return JSON.stringify(sanitized, null, 2);
  }
  
  async importConfiguration(jsonData: string): Promise<APIConfiguration> {
    try {
      const config = JSON.parse(jsonData);
      const validated = await this.validateImportedConfig(config);
      return this.mergeWithDefaults(validated);
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error.message}`);
    }
  }
  
  private sanitizeForExport(config: APIConfiguration): any {
    return {
      ...config,
      providers: config.providers.map(provider => ({
        ...provider,
        connection: {
          ...provider.connection,
          apiKey: provider.connection.apiKey ? '[REDACTED]' : ''
        }
      }))
    };
  }
  
  private async validateImportedConfig(config: any): Promise<APIConfiguration> {
    const validator = new ConfigurationValidator();
    const errors = validator.validate(config);
    
    const criticalErrors = errors.filter(e => e.severity === 'error');
    if (criticalErrors.length > 0) {
      throw new Error(`Configuration validation failed: ${criticalErrors.map(e => e.message).join(', ')}`);
    }
    
    return config;
  }
  
  private mergeWithDefaults(config: Partial<APIConfiguration>): APIConfiguration {
    return {
      providers: config.providers || [],
      router: config.router || getDefaultRouter(),
      monitoring: config.monitoring || getDefaultMonitoring(),
      security: config.security || getDefaultSecurity(),
      defaults: config.defaults || getDefaultDefaults(),
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...config.metadata
      }
    };
  }
}
```

### Configuration Versioning & Migration

```typescript
interface ConfigurationVersion {
  version: string;
  timestamp: string;
  configuration: APIConfiguration;
  changes: ConfigurationChange[];
  author?: string;
}

interface ConfigurationChange {
  type: 'added' | 'modified' | 'removed';
  path: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
}

class ConfigurationVersionManager {
  private versions: ConfigurationVersion[] = [];
  private maxVersions = 10;
  
  saveVersion(
    configuration: APIConfiguration, 
    changes: ConfigurationChange[],
    author?: string
  ): string {
    const version: ConfigurationVersion = {
      version: this.generateVersionString(),
      timestamp: new Date().toISOString(),
      configuration: structuredClone(configuration),
      changes,
      author
    };
    
    this.versions.unshift(version);
    
    // Keep only recent versions
    if (this.versions.length > this.maxVersions) {
      this.versions = this.versions.slice(0, this.maxVersions);
    }
    
    return version.version;
  }
  
  getVersionHistory(): ConfigurationVersion[] {
    return [...this.versions];
  }
  
  restoreVersion(version: string): APIConfiguration | null {
    const versionData = this.versions.find(v => v.version === version);
    return versionData ? structuredClone(versionData.configuration) : null;
  }
  
  compareVersions(version1: string, version2: string): ConfigurationChange[] {
    const v1 = this.versions.find(v => v.version === version1);
    const v2 = this.versions.find(v => v.version === version2);
    
    if (!v1 || !v2) return [];
    
    return this.generateDiff(v1.configuration, v2.configuration);
  }
  
  private generateVersionString(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `v${timestamp}`;
  }
  
  private generateDiff(oldConfig: APIConfiguration, newConfig: APIConfiguration): ConfigurationChange[] {
    const changes: ConfigurationChange[] = [];
    const timestamp = new Date().toISOString();
    
    // Compare providers
    this.diffArrays(oldConfig.providers, newConfig.providers, 'providers', changes, timestamp);
    
    // Compare router
    this.diffObjects(oldConfig.router, newConfig.router, 'router', changes, timestamp);
    
    // Compare other sections...
    
    return changes;
  }
  
  private diffArrays(oldArray: any[], newArray: any[], path: string, changes: ConfigurationChange[], timestamp: string): void {
    // Implementation for array diffing
    // This would detect added, removed, and modified items
  }
  
  private diffObjects(oldObj: any, newObj: any, path: string, changes: ConfigurationChange[], timestamp: string): void {
    // Implementation for object diffing
    // This would detect added, removed, and modified properties
  }
}

// Configuration migration system
class ConfigurationMigration {
  private migrations: Map<string, (config: any) => any> = new Map([
    ['1.0.0', this.migrateToV1_0_0],
    ['1.1.0', this.migrateToV1_1_0],
    ['2.0.0', this.migrateToV2_0_0],
  ]);
  
  async migrate(config: any, targetVersion: string): Promise<APIConfiguration> {
    const currentVersion = config.metadata?.version || '0.0.0';
    
    if (currentVersion === targetVersion) {
      return config;
    }
    
    const migrationPath = this.getMigrationPath(currentVersion, targetVersion);
    
    let migratedConfig = config;
    for (const version of migrationPath) {
      const migration = this.migrations.get(version);
      if (migration) {
        migratedConfig = migration(migratedConfig);
        migratedConfig.metadata.version = version;
      }
    }
    
    return migratedConfig;
  }
  
  private getMigrationPath(from: string, to: string): string[] {
    // Return array of versions to migrate through
    const versions = Array.from(this.migrations.keys()).sort();
    const fromIndex = versions.indexOf(from);
    const toIndex = versions.indexOf(to);
    
    if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
      return [];
    }
    
    return versions.slice(fromIndex + 1, toIndex + 1);
  }
  
  private migrateToV1_0_0(config: any): any {
    // Migration logic for v1.0.0
    return {
      ...config,
      providers: config.providers?.map((provider: any) => ({
        ...provider,
        healthCheck: provider.healthCheck || {
          enabled: true,
          interval: 300000,
          timeout: 10000
        }
      })) || []
    };
  }
  
  private migrateToV1_1_0(config: any): any {
    // Migration logic for v1.1.0
    return {
      ...config,
      security: config.security || {
        encryption: { enabled: false },
        apiKeyRotation: { enabled: false },
        auditLogging: { enabled: true }
      }
    };
  }
  
  private migrateToV2_0_0(config: any): any {
    // Migration logic for v2.0.0
    return {
      ...config,
      providers: config.providers?.map((provider: any) => ({
        ...provider,
        features: {
          ...provider.features,
          functionCalling: provider.features?.functionCalling || false,
          imageProcessing: provider.features?.imageProcessing || false
        }
      })) || []
    };
  }
}
```

---

## Real-time Monitoring

### Live Configuration Status

```typescript
interface ConfigurationStatus {
  overall: 'healthy' | 'warning' | 'error';
  providers: Map<string, ProviderStatus>;
  router: RouterStatus;
  lastUpdate: string;
  issues: Issue[];
}

interface Issue {
  id: string;
  severity: 'info' | 'warning' | 'error';
  component: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolutionSteps?: string[];
}

class ConfigurationMonitor {
  private status: ConfigurationStatus = {
    overall: 'healthy',
    providers: new Map(),
    router: { healthy: true, activeRoutes: 0 },
    lastUpdate: new Date().toISOString(),
    issues: []
  };
  
  private eventEmitter = new EventTarget();
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  startMonitoring(configuration: APIConfiguration): void {
    this.monitoringInterval = setInterval(() => {
      this.checkConfiguration(configuration);
    }, 30000); // Check every 30 seconds
    
    // Initial check
    this.checkConfiguration(configuration);
  }
  
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  private async checkConfiguration(configuration: APIConfiguration): Promise<void> {
    const newStatus: ConfigurationStatus = {
      overall: 'healthy',
      providers: new Map(),
      router: { healthy: true, activeRoutes: 0 },
      lastUpdate: new Date().toISOString(),
      issues: []
    };
    
    // Check each provider
    for (const provider of configuration.providers) {
      if (provider.enabled) {
        const providerStatus = await this.checkProvider(provider);
        newStatus.providers.set(provider.id, providerStatus);
        
        if (!providerStatus.healthy && newStatus.overall === 'healthy') {
          newStatus.overall = 'warning';
        }
      }
    }
    
    // Check router configuration
    const routerStatus = this.checkRouter(configuration.router, configuration.providers);
    newStatus.router = routerStatus;
    
    if (!routerStatus.healthy) {
      newStatus.overall = 'error';
      newStatus.issues.push({
        id: 'router-unhealthy',
        severity: 'error',
        component: 'router',
        message: 'Router configuration has issues',
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
    
    // Update status and emit events
    const hasChanges = this.hasStatusChanged(this.status, newStatus);
    this.status = newStatus;
    
    if (hasChanges) {
      this.eventEmitter.dispatchEvent(new CustomEvent('statusChanged', {
        detail: newStatus
      }));
    }
  }
  
  private async checkProvider(provider: ProviderConfig): Promise<ProviderStatus> {
    try {
      const response = await fetch(`${provider.connection.apiBaseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.connection.apiKey}`,
        },
        timeout: provider.connection.timeout
      });
      
      return {
        healthy: response.ok,
        responseTime: Date.now() - performance.now(),
        lastCheck: new Date().toISOString(),
        error: response.ok ? null : `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private checkRouter(router: RouterConfig, providers: ProviderConfig[]): RouterStatus {
    const enabledProviders = providers.filter(p => p.enabled);
    const activeRoutes = Object.values(router.routes || {}).filter(route => {
      const [providerId] = route.split(',');
      return enabledProviders.some(p => p.id === providerId);
    }).length;
    
    return {
      healthy: activeRoutes > 0,
      activeRoutes,
      issues: activeRoutes === 0 ? ['No active routes available'] : []
    };
  }
  
  private hasStatusChanged(oldStatus: ConfigurationStatus, newStatus: ConfigurationStatus): boolean {
    return oldStatus.overall !== newStatus.overall ||
           oldStatus.providers.size !== newStatus.providers.size ||
           oldStatus.router.healthy !== newStatus.router.healthy;
  }
  
  getStatus(): ConfigurationStatus {
    return { ...this.status };
  }
  
  addEventListener(type: string, listener: EventListener): void {
    this.eventEmitter.addEventListener(type, listener);
  }
  
  removeEventListener(type: string, listener: EventListener): void {
    this.eventEmitter.removeEventListener(type, listener);
  }
}

// React hook for configuration monitoring
export function useConfigurationMonitor(configuration: APIConfiguration) {
  const [status, setStatus] = useState<ConfigurationStatus | null>(null);
  const [monitor] = useState(() => new ConfigurationMonitor());
  
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent<ConfigurationStatus>) => {
      setStatus(event.detail);
    };
    
    monitor.addEventListener('statusChanged', handleStatusChange as EventListener);
    monitor.startMonitoring(configuration);
    
    return () => {
      monitor.removeEventListener('statusChanged', handleStatusChange as EventListener);
      monitor.stopMonitoring();
    };
  }, [configuration, monitor]);
  
  return {
    status,
    isHealthy: status?.overall === 'healthy',
    hasWarnings: status?.overall === 'warning',
    hasErrors: status?.overall === 'error',
    issues: status?.issues || [],
    providerStatuses: status?.providers || new Map()
  };
}
```

---

## Security & Access Control

### Role-Based Access Control

```typescript
interface UserRole {
  id: string;
  name: string;
  permissions: Permission[];
  description: string;
}

interface Permission {
  resource: 'configuration' | 'providers' | 'monitoring' | 'billing';
  actions: ('read' | 'write' | 'delete' | 'test')[];
  conditions?: PermissionCondition[];
}

interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in';
  value: any;
}

const DEFAULT_ROLES: UserRole[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access to all configuration settings',
    permissions: [
      {
        resource: 'configuration',
        actions: ['read', 'write', 'delete']
      },
      {
        resource: 'providers',
        actions: ['read', 'write', 'delete', 'test']
      },
      {
        resource: 'monitoring',
        actions: ['read', 'write']
      },
      {
        resource: 'billing',
        actions: ['read', 'write']
      }
    ]
  },
  {
    id: 'operator',
    name: 'Operator',
    description: 'Can modify settings but cannot delete providers',
    permissions: [
      {
        resource: 'configuration',
        actions: ['read', 'write']
      },
      {
        resource: 'providers',
        actions: ['read', 'write', 'test']
      },
      {
        resource: 'monitoring',
        actions: ['read', 'write']
      },
      {
        resource: 'billing',
        actions: ['read']
      }
    ]
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to configuration and monitoring',
    permissions: [
      {
        resource: 'configuration',
        actions: ['read']
      },
      {
        resource: 'providers',
        actions: ['read']
      },
      {
        resource: 'monitoring',
        actions: ['read']
      },
      {
        resource: 'billing',
        actions: ['read']
      }
    ]
  }
];

class AccessControlManager {
  private userRoles: Map<string, string> = new Map();
  private customRoles: Map<string, UserRole> = new Map();
  
  setUserRole(userId: string, roleId: string): void {
    this.userRoles.set(userId, roleId);
  }
  
  hasPermission(
    userId: string, 
    resource: Permission['resource'], 
    action: Permission['actions'][0],
    context?: any
  ): boolean {
    const roleId = this.userRoles.get(userId);
    if (!roleId) return false;
    
    const role = this.getRole(roleId);
    if (!role) return false;
    
    const permission = role.permissions.find(p => p.resource === resource);
    if (!permission || !permission.actions.includes(action)) {
      return false;
    }
    
    // Check conditions if any
    if (permission.conditions && context) {
      return permission.conditions.every(condition => 
        this.evaluateCondition(condition, context)
      );
    }
    
    return true;
  }
  
  private getRole(roleId: string): UserRole | undefined {
    return DEFAULT_ROLES.find(r => r.id === roleId) || 
           this.customRoles.get(roleId);
  }
  
  private evaluateCondition(condition: PermissionCondition, context: any): boolean {
    const contextValue = this.getNestedValue(context, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'not_equals':
        return contextValue !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(contextValue);
      default:
        return false;
    }
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Secure component wrapper
interface SecureComponentProps {
  resource: Permission['resource'];
  action: Permission['actions'][0];
  userId: string;
  context?: any;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const SecureComponent: React.FC<SecureComponentProps> = ({
  resource,
  action,
  userId,
  context,
  fallback,
  children
}) => {
  const accessControl = useAccessControl();
  
  const hasAccess = accessControl.hasPermission(userId, resource, action, context);
  
  if (!hasAccess) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
        <p className="text-red-400">Access denied: Insufficient permissions</p>
      </div>
    );
  }
  
  return <>{children}</>;
};
```

### Audit Logging System

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: ConfigurationChange[];
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

class ConfigurationAuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 10000;
  
  logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const logEntry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...entry
    };
    
    this.logs.unshift(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    // Persist to storage
    this.persistLog(logEntry);
  }
  
  getAuditTrail(filters?: {
    userId?: string;
    resource?: string;
    dateFrom?: string;
    dateTo?: string;
    action?: string;
  }): AuditLogEntry[] {
    let filtered = [...this.logs];
    
    if (filters) {
      if (filters.userId) {
        filtered = filtered.filter(log => log.userId === filters.userId);
      }
      if (filters.resource) {
        filtered = filtered.filter(log => log.resource === filters.resource);
      }
      if (filters.dateFrom) {
        filtered = filtered.filter(log => log.timestamp >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filtered = filtered.filter(log => log.timestamp <= filters.dateTo!);
      }
      if (filters.action) {
        filtered = filtered.filter(log => log.action === filters.action);
      }
    }
    
    return filtered;
  }
  
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async persistLog(entry: AuditLogEntry): Promise<void> {
    // Implementation would persist to database or file system
    console.log('Audit log:', entry);
  }
}

// Audit logging middleware for configuration changes
export function withAuditLogging<T extends (...args: any[]) => any>(
  fn: T,
  resource: string,
  action: string,
  getUserId: () => string
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const auditLogger = new ConfigurationAuditLogger();
    const userId = getUserId();
    const startTime = Date.now();
    
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result
          .then((value) => {
            auditLogger.logAction({
              userId,
              action,
              resource,
              success: true,
              metadata: {
                executionTime: Date.now() - startTime,
                args: args.map(arg => typeof arg)
              }
            });
            return value;
          })
          .catch((error) => {
            auditLogger.logAction({
              userId,
              action,
              resource,
              success: false,
              error: error.message,
              metadata: {
                executionTime: Date.now() - startTime
              }
            });
            throw error;
          }) as ReturnType<T>;
      }
      
      // Handle sync functions
      auditLogger.logAction({
        userId,
        action,
        resource,
        success: true,
        metadata: {
          executionTime: Date.now() - startTime
        }
      });
      
      return result;
    } catch (error) {
      auditLogger.logAction({
        userId,
        action,
        resource,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime: Date.now() - startTime
        }
      });
      throw error;
    }
  }) as T;
}
```

---

## Implementation Examples

### Complete Configuration Interface

```typescript
// Main application component with full configuration interface
export const ConfigurationApp: React.FC = () => {
  const [configuration, setConfiguration] = useState<APIConfiguration>(getDefaultConfiguration());
  const [currentUser] = useState({ id: 'user-123', role: 'admin' });
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  
  const { status, isHealthy } = useConfigurationMonitor(configuration);
  
  const handleConfigurationChange = useCallback(async (newConfig: APIConfiguration) => {
    // Validate configuration
    const validator = new ConfigurationValidator();
    const errors = validator.validate(newConfig);
    setValidationErrors(errors);
    
    // Only update if no critical errors
    const criticalErrors = errors.filter(e => e.severity === 'error');
    if (criticalErrors.length === 0) {
      setConfiguration(newConfig);
      
      // Auto-save configuration
      await saveConfigurationToBackend(newConfig);
    }
  }, []);
  
  const handleExportConfiguration = useCallback(async () => {
    const manager = new ConfigurationManager();
    const exported = await manager.exportConfiguration(configuration);
    
    // Download as JSON file
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moonlock-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [configuration]);
  
  const handleImportConfiguration = useCallback(async (file: File) => {
    try {
      const content = await file.text();
      const manager = new ConfigurationManager();
      const imported = await manager.importConfiguration(content);
      
      await handleConfigurationChange(imported);
      
      // Show success message
      toast.success('Configuration imported successfully');
    } catch (error) {
      toast.error(`Import failed: ${error.message}`);
    }
  }, [handleConfigurationChange]);
  
  return (
    <div className="h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Moonlock Configuration</h1>
            <ConfigurationStatusBadge 
              status={status?.overall || 'unknown'}
              tooltip="Overall system health"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <ImportExportMenu
              onExport={handleExportConfiguration}
              onImport={handleImportConfiguration}
            />
            <UserMenu user={currentUser} />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <SecureComponent
          resource="configuration"
          action="read"
          userId={currentUser.id}
          fallback={<AccessDeniedView />}
        >
          <APIConfigurationInterface
            configuration={configuration}
            onConfigurationChange={handleConfigurationChange}
            readOnly={!hasWriteAccess(currentUser.role)}
            validationErrors={validationErrors}
          />
        </SecureComponent>
      </main>
      
      {/* Toast Notifications */}
      <ToastContainer
        position="bottom-right"
        theme="dark"
        toastClassName="bg-dark-800 text-white"
      />
    </div>
  );
};

// Helper components
const ConfigurationStatusBadge: React.FC<{
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  tooltip?: string;
}> = ({ status, tooltip }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return { color: 'bg-green-500', text: 'Healthy', icon: '✅' };
      case 'warning':
        return { color: 'bg-yellow-500', text: 'Warning', icon: '⚠️' };
      case 'error':
        return { color: 'bg-red-500', text: 'Error', icon: '❌' };
      default:
        return { color: 'bg-gray-500', text: 'Unknown', icon: '❓' };
    }
  };
  
  const config = getStatusConfig(status);
  
  return (
    <div 
      className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${config.color} text-white`}
      title={tooltip}
    >
      <span>{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
};

const ImportExportMenu: React.FC<{
  onExport: () => void;
  onImport: (file: File) => void;
}> = ({ onExport, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = ''; // Reset input
    }
  };
  
  return (
    <div className="relative">
      <button
        className="flex items-center space-x-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
        onClick={onExport}
      >
        <span>📤</span>
        <span>Export</span>
      </button>
      
      <button
        className="flex items-center space-x-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors ml-2"
        onClick={handleImportClick}
      >
        <span>📥</span>
        <span>Import</span>
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
```

---

## Best Practices

### 1. Configuration Organization

```typescript
const CONFIGURATION_BEST_PRACTICES = {
  structure: {
    // Group related settings together
    groupByFunction: true,
    
    // Use consistent naming conventions
    namingConvention: 'camelCase',
    
    // Provide clear descriptions
    includeDescriptions: true,
    
    // Use sensible defaults
    provideDefaults: true
  },
  
  validation: {
    // Validate on change
    validateOnChange: true,
    
    // Provide helpful error messages
    descriptiveErrors: true,
    
    // Suggest corrections
    provideSuggestions: true,
    
    // Prevent invalid states
    preventInvalidStates: true
  },
  
  security: {
    // Never store sensitive data in plain text
    encryptSensitiveData: true,
    
    // Use environment variables for secrets
    useEnvironmentVariables: true,
    
    // Implement access controls
    roleBasedAccess: true,
    
    // Log all changes
    auditAllChanges: true
  }
};
```

### 2. User Experience Guidelines

```typescript
const UX_BEST_PRACTICES = {
  interface: {
    // Progressive disclosure
    hideComplexityByDefault: true,
    
    // Provide contextual help
    contextualHelp: true,
    
    // Show real-time validation
    liveValidation: true,
    
    // Auto-save changes
    autoSave: true
  },
  
  feedback: {
    // Show loading states
    loadingIndicators: true,
    
    // Confirm destructive actions
    confirmDestructive: true,
    
    // Provide undo functionality
    undoSupport: true,
    
    // Show success messages
    successFeedback: true
  },
  
  performance: {
    // Lazy load complex components
    lazyLoading: true,
    
    // Debounce inputs
    debounceInputs: true,
    
    // Cache frequently accessed data
    cacheData: true,
    
    // Optimize re-renders
    optimizeRenders: true
  }
};
```

### 3. Maintenance & Monitoring

```typescript
const MAINTENANCE_BEST_PRACTICES = {
  monitoring: {
    // Health check all providers
    healthChecks: true,
    
    // Monitor performance metrics
    performanceMetrics: true,
    
    // Track cost and usage
    costTracking: true,
    
    // Alert on issues
    alerting: true
  },
  
  maintenance: {
    // Regular backups
    regularBackups: true,
    
    // Version control
    versionControl: true,
    
    // Configuration migration
    migrationSupport: true,
    
    // Regular updates
    regularUpdates: true
  },
  
  documentation: {
    // Keep docs updated
    updateDocumentation: true,
    
    // Provide examples
    includeExamples: true,
    
    // Document breaking changes
    documentBreakingChanges: true,
    
    // Maintain changelog
    maintainChangelog: true
  }
};
```

---

## Next Steps

1. **Interface Implementation**: Deploy the configuration interface components to your dashboard
2. **Security Setup**: Implement role-based access control and audit logging
3. **Monitoring Integration**: Set up real-time configuration monitoring
4. **Migration Planning**: Prepare configuration migration strategies for future updates
5. **User Training**: Provide documentation and training for configuration management
6. **Testing**: Validate all configuration scenarios with comprehensive testing
7. **Performance Optimization**: Implement caching and optimization strategies

This comprehensive API configuration interface provides a robust foundation for managing multi-provider AI integrations with security, monitoring, and user experience best practices.