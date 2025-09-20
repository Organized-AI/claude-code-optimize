/**
 * Claude SDK Interface
 * 
 * Direct API interaction component allowing users to:
 * - Send prompts directly to Claude API
 * - Select between different Claude models
 * - View real-time responses and token usage
 * - Monitor API costs and response times
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAnthropicAPI } from '../hooks/useAnthropicAPI';
import { useClaudeCodeCommands, SlashCommand } from '../hooks/useClaudeCodeCommands';

interface PromptHistory {
  id: string;
  prompt: string;
  response: string;
  model: string;
  tokens: {
    input: number;
    output: number;
  };
  cost: number;
  responseTime: number;
  timestamp: number;
  isCommand?: boolean;
  commandResult?: any;
}

interface CommandSuggestion {
  command: SlashCommand;
  highlight: string;
}

export const ClaudeSDKInterface: React.FC = () => {
  const {
    serviceAvailable,
    sendDirectPrompt,
    usageMetrics,
    formatCost,
    formatTokens,
    formatResponseTime
  } = useAnthropicAPI();
  
  const {
    availableCommands,
    commandHistory,
    isExecutingCommand,
    executeCommand,
    getCommandSuggestions,
    formatCommandOutput,
    error: commandError,
    clearError
  } = useClaudeCodeCommands();

  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<'claude-3-5-sonnet-20241022' | 'claude-3-opus-20240229'>('claude-3-5-sonnet-20241022');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<PromptHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxTokens, setMaxTokens] = useState(4000);
  const [temperature, setTemperature] = useState(0.7);
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState<CommandSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [mode, setMode] = useState<'chat' | 'command' | 'plan'>('chat');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);
  
  // Handle command suggestions
  useEffect(() => {
    if (prompt.startsWith('/') && prompt.length > 1) {
      const query = prompt.slice(1);
      const suggestions = getCommandSuggestions(query);
      setCommandSuggestions(
        suggestions.map(cmd => ({
          command: cmd,
          highlight: cmd.command
        }))
      );
      setShowCommandSuggestions(true);
      setSelectedSuggestionIndex(-1);
    } else {
      setShowCommandSuggestions(false);
      setCommandSuggestions([]);
    }
  }, [prompt, getCommandSuggestions]);
  
  // Clear command error when prompt changes
  useEffect(() => {
    if (commandError) {
      clearError();
    }
  }, [prompt]);

  const handleSendPrompt = async () => {
    if (!prompt.trim() || (isLoading || isExecutingCommand)) return;

    const isCommand = prompt.startsWith('/');
    setIsLoading(!isCommand);
    setError(null);
    setShowCommandSuggestions(false);

    try {
      const startTime = Date.now();
      let historyItem: PromptHistory;
      
      if (isCommand) {
        // Handle slash command
        const [command, ...args] = prompt.split(' ');
        const result = await executeCommand(command, args);
        
        historyItem = {
          id: Date.now().toString(),
          prompt: prompt.trim(),
          response: formatCommandOutput(result.output),
          model: 'claude-code-cli',
          tokens: { input: 0, output: 0 },
          cost: 0,
          responseTime: result.duration,
          timestamp: Date.now(),
          isCommand: true,
          commandResult: result
        };
      } else {
        // Handle regular prompt
        if (!serviceAvailable) {
          throw new Error('Claude API service not available');
        }
        
        const response = await sendDirectPrompt(prompt, selectedModel);
        const endTime = Date.now();

        historyItem = {
          id: Date.now().toString(),
          prompt: prompt.trim(),
          response: response.response,
          model: response.model,
          tokens: {
            input: response.usage.inputTokens,
            output: response.usage.outputTokens
          },
          cost: response.cost,
          responseTime: endTime - startTime,
          timestamp: Date.now(),
          isCommand: false
        };
      }

      setHistory(prev => [...prev, historyItem]);
      setPrompt('');

    } catch (error) {
      console.error('❌ Failed to execute:', error);
      setError(error instanceof Error ? error.message : 'Execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (showCommandSuggestions && commandSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < commandSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : commandSuggestions.length - 1
        );
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault();
          const suggestion = commandSuggestions[selectedSuggestionIndex];
          setPrompt(suggestion.command.command + ' ');
          setShowCommandSuggestions(false);
          return;
        }
      } else if (e.key === 'Escape') {
        setShowCommandSuggestions(false);
      }
    }
    
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setError(null);
  };

  const getModelDisplayName = (model: string) => {
    switch (model) {
      case 'claude-3-5-sonnet-20241022': return 'Claude 3.5 Sonnet';
      case 'claude-3-opus-20240229': return 'Claude 3 Opus';
      default: return model;
    }
  };

  const getModelColor = (model: string) => {
    switch (model) {
      case 'claude-3-5-sonnet-20241022': return 'text-moonlock-400';
      case 'claude-3-opus-20240229': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const totalCost = history.reduce((sum, item) => sum + item.cost, 0);
  const totalTokens = history.reduce((sum, item) => sum + item.tokens.input + item.tokens.output, 0);
  const avgResponseTime = history.length > 0 ? 
    history.reduce((sum, item) => sum + item.responseTime, 0) / history.length : 0;

  const isServiceAvailable = serviceAvailable || availableCommands.length > 0;
  
  if (!isServiceAvailable) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-gray-400 text-2xl">🤖</span>
          </div>
          <div className="space-y-2">
            <p className="text-gray-400 font-medium">Claude SDK Interface Unavailable</p>
            <p className="text-dark-400 text-sm">Requires CLAUDE_API_KEY or Claude Code CLI</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header with Stats and Mode Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-moonlock-400">Claude SDK Interface</h3>
          
          {/* Mode Selector */}
          <div className="flex items-center space-x-2 bg-dark-800 rounded-lg p-1">
            {['chat', 'command', 'plan'].map((modeOption) => (
              <button
                key={modeOption}
                onClick={() => setMode(modeOption as typeof mode)}
                className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                  mode === modeOption
                    ? 'bg-moonlock-600 text-white'
                    : 'text-dark-400 hover:text-dark-200'
                }`}
              >
                {modeOption}
              </button>
            ))}
          </div>
          
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
            >
              Clear History
            </button>
          )}
        </div>
        
        {history.length > 0 && (
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-dark-400">
              {history.length} conversations
            </span>
            <span className="text-yellow-400">
              {formatCost(totalCost)} total
            </span>
            <span className="text-blue-400">
              {formatTokens(totalTokens)} tokens
            </span>
          </div>
        )}
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
        {history.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-moonlock-500/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-moonlock-400 text-xl">💬</span>
              </div>
              <p className="text-dark-400">Start a conversation with Claude</p>
              <p className="text-dark-500 text-sm">Use ⌘/Ctrl + Enter to send</p>
            </div>
          </div>
        ) : (
          history.map((item) => (
            <ConversationItem
              key={item.id}
              item={item}
              getModelDisplayName={getModelDisplayName}
              getModelColor={getModelColor}
              formatCost={formatCost}
              formatTokens={formatTokens}
              formatResponseTime={formatResponseTime}
              formatCommandOutput={formatCommandOutput}
            />
          ))
        )}
        <div ref={historyEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-red-400">⚠️</span>
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="space-y-3">
        {/* Model and Settings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {mode === 'chat' && (
              <>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as any)}
                  disabled={isLoading}
                  className="bg-dark-800 border border-dark-600 rounded px-3 py-1 text-sm text-dark-200 focus:border-moonlock-500 focus:outline-none"
                >
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                </select>
                
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced
                </button>
              </>
            )}
            
            {mode === 'command' && (
              <div className="flex items-center space-x-2 text-xs text-dark-400">
                <span>{availableCommands.length} commands available</span>
                <span>•</span>
                <span>Type / to see suggestions</span>
              </div>
            )}
          </div>

          {usageMetrics && (
            <div className="flex items-center space-x-3 text-xs text-dark-400">
              <span>Rate: {usageMetrics.rateLimitStatus.percentUsed.toFixed(1)}%</span>
              <span>Daily: {formatCost(usageMetrics.costEstimate.daily)}</span>
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        {showAdvanced && mode === 'chat' && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-dark-800 rounded-lg border border-dark-700">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Max Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                min={1}
                max={8192}
                className="w-full bg-dark-700 border border-dark-600 rounded px-2 py-1 text-sm text-dark-200 focus:border-moonlock-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Temperature</label>
              <input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                min={0}
                max={1}
                step={0.1}
                className="w-full bg-dark-700 border border-dark-600 rounded px-2 py-1 text-sm text-dark-200 focus:border-moonlock-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Prompt Input */}
        <div className="flex space-x-3 relative">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                mode === 'chat' ? 'Type your message to Claude...' :
                mode === 'command' ? 'Type a slash command (e.g., /help)...' :
                'Describe your plan steps...'
              }
              disabled={isLoading || isExecutingCommand}
              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-3 text-dark-200 placeholder-dark-500 focus:border-moonlock-500 focus:outline-none resize-none min-h-[100px] max-h-[200px]"
            />
            
            {/* Command Suggestions */}
            {showCommandSuggestions && commandSuggestions.length > 0 && (
              <div 
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
              >
                {commandSuggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.command.command}
                    className={`px-4 py-2 cursor-pointer border-b border-dark-700 last:border-b-0 ${
                      index === selectedSuggestionIndex
                        ? 'bg-moonlock-600/20 border-moonlock-500'
                        : 'hover:bg-dark-700'
                    }`}
                    onClick={() => {
                      setPrompt(suggestion.command.command + ' ');
                      setShowCommandSuggestions(false);
                      textareaRef.current?.focus();
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-moonlock-400 font-mono text-sm">
                        {suggestion.command.command}
                      </span>
                      <span className="text-xs text-dark-400 capitalize">
                        {suggestion.command.category}
                      </span>
                    </div>
                    <p className="text-xs text-dark-300 mt-1">
                      {suggestion.command.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={handleSendPrompt}
            disabled={!prompt.trim() || isLoading || isExecutingCommand}
            className="px-6 py-3 bg-moonlock-600 text-white rounded-lg hover:bg-moonlock-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {(isLoading || isExecutingCommand) ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>{isExecutingCommand ? 'Executing...' : 'Sending...'}</span>
              </>
            ) : (
              <>
                <span>{mode === 'command' ? 'Execute' : 'Send'}</span>
                <span className="text-xs opacity-60">⌘↵</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConversationItemProps {
  item: PromptHistory;
  getModelDisplayName: (model: string) => string;
  getModelColor: (model: string) => string;
  formatCost: (amount: number) => string;
  formatTokens: (tokens: number) => string;
  formatResponseTime: (ms: number) => string;
  formatCommandOutput?: (output: string) => string;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  item,
  getModelDisplayName,
  getModelColor,
  formatCost,
  formatTokens,
  formatResponseTime,
  formatCommandOutput
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const displayName = item.isCommand 
    ? 'Claude Code CLI' 
    : getModelDisplayName(item.model);
    
  const displayColor = item.isCommand 
    ? 'text-yellow-400' 
    : getModelColor(item.model);

  return (
    <div className="space-y-3">
      {/* User Prompt */}
      <div className="flex justify-end">
        <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
          item.isCommand 
            ? 'bg-yellow-600/20 border border-yellow-600/30' 
            : 'bg-moonlock-600'
        }`}>
          <div className="flex items-center space-x-2 mb-1">
            {item.isCommand && (
              <span className="text-yellow-400 text-xs">🔧 COMMAND</span>
            )}
          </div>
          <p className="text-white whitespace-pre-wrap font-mono text-sm">
            {item.prompt}
          </p>
        </div>
      </div>

      {/* Response */}
      <div className="flex justify-start">
        <div className="max-w-[80%] bg-dark-800 border border-dark-700 rounded-lg">
          {/* Response Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-dark-700">
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${displayColor}`}>
                {displayName}
              </span>
              <span className="text-xs text-dark-400">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
              {item.isCommand && item.commandResult && (
                <span className={`text-xs px-2 py-1 rounded ${
                  item.commandResult.success 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {item.commandResult.success ? 'SUCCESS' : 'FAILED'}
                </span>
              )}
            </div>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-dark-400 hover:text-dark-200 transition-colors"
            >
              {isExpanded ? '−' : '+'}
            </button>
          </div>

          {/* Response Content */}
          {isExpanded && (
            <div className="px-4 py-3">
              <div className={`mb-3 ${
                item.isCommand ? 'font-mono text-sm' : ''
              }`}>
                <pre className="text-dark-200 whitespace-pre-wrap overflow-x-auto">
                  {item.isCommand && formatCommandOutput 
                    ? formatCommandOutput(item.response) 
                    : item.response
                  }
                </pre>
              </div>
              
              {/* Command Error */}
              {item.isCommand && item.commandResult?.error && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm font-mono">
                    Error: {item.commandResult.error}
                  </p>
                </div>
              )}
              
              {/* Response Stats */}
              <div className="flex items-center justify-between text-xs text-dark-500 pt-2 border-t border-dark-700">
                <div className="flex items-center space-x-4">
                  <span>⏱️ {formatResponseTime(item.responseTime)}</span>
                  {!item.isCommand && (
                    <span>💰 {formatCost(item.cost)}</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {item.isCommand ? (
                    <span className="text-yellow-400">CLI Command</span>
                  ) : (
                    <>
                      <span className="text-blue-400">{formatTokens(item.tokens.input)} in</span>
                      <span className="text-green-400">{formatTokens(item.tokens.output)} out</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};