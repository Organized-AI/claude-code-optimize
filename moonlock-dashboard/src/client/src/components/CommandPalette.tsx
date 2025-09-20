import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useClaudeCodeCommands, SlashCommand } from '../hooks/useClaudeCodeCommands';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: string, args: string[]) => Promise<void>;
}

interface CommandMatch {
  command: SlashCommand;
  score: number;
  matchText: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExecuteCommand
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<CommandMatch[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const commandListRef = useRef<HTMLDivElement>(null);
  
  const { 
    availableCommands, 
    commandHistory, 
    error,
    clearError 
  } = useClaudeCodeCommands();

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
      clearError();
    }
  }, [isOpen, clearError]);

  // Load recent commands from history
  useEffect(() => {
    const recent = commandHistory
      .filter(cmd => cmd.success)
      .slice(0, 5)
      .map(cmd => cmd.command);
    setRecentCommands(recent);
  }, [commandHistory]);

  // Filter and score commands based on query
  useEffect(() => {
    if (!query.trim()) {
      // Show recent commands when no query
      const recentMatches: CommandMatch[] = recentCommands
        .map(cmdStr => {
          const [command] = cmdStr.split(' ');
          const cmd = availableCommands.find(c => c.command === command);
          return cmd ? {
            command: cmd,
            score: 1,
            matchText: cmd.command
          } : null;
        })
        .filter((match): match is CommandMatch => match !== null);
      
      setFilteredCommands(recentMatches);
      setSelectedIndex(0);
      return;
    }

    const queryLower = query.toLowerCase();
    const matches: CommandMatch[] = [];

    for (const command of availableCommands) {
      let score = 0;
      let matchText = command.command;

      // Exact match gets highest score
      if (command.command.toLowerCase() === queryLower) {
        score = 100;
      }
      // Command starts with query
      else if (command.command.toLowerCase().startsWith(queryLower)) {
        score = 90;
      }
      // Command contains query
      else if (command.command.toLowerCase().includes(queryLower)) {
        score = 70;
      }
      // Description contains query
      else if (command.description.toLowerCase().includes(queryLower)) {
        score = 50;
      }
      // Category contains query
      else if (command.category.toLowerCase().includes(queryLower)) {
        score = 30;
      }

      if (score > 0) {
        matches.push({ command, score, matchText });
      }
    }

    // Sort by score, then alphabetically
    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.command.command.localeCompare(b.command.command);
    });

    setFilteredCommands(matches.slice(0, 10)); // Limit to 10 results
    setSelectedIndex(0);
  }, [query, availableCommands, recentCommands]);

  // Scroll selected item into view
  useEffect(() => {
    if (commandListRef.current) {
      const selectedElement = commandListRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleExecuteCommand(filteredCommands[selectedIndex].command);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
        
      case 'Tab':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          const cmd = filteredCommands[selectedIndex].command;
          setQuery(cmd.command + ' ');
          inputRef.current?.focus();
        }
        break;
    }
  }, [filteredCommands, selectedIndex, onClose]);

  const handleExecuteCommand = async (command: SlashCommand) => {
    if (isExecuting) return;

    try {
      setIsExecuting(true);
      
      // Parse command and arguments from query
      const parts = query.trim().split(/\s+/);
      const commandName = parts[0] || command.command;
      const args = parts.slice(1);

      await onExecuteCommand(commandName, args);
      onClose();
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query) return text;
    
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    
    return (
      <>
        {text.slice(0, index)}
        <mark className=\"bg-moonlock-500/30 text-moonlock-300 px-1 rounded\">
          {text.slice(index, index + query.length)}
        </mark>
        {text.slice(index + query.length)}
      </>
    );
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'built-in': return '🔧';
      case 'custom': return '⚡';
      case 'mcp': return '🔌';
      default: return '📝';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'built-in': return 'text-blue-400';
      case 'custom': return 'text-green-400';
      case 'mcp': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className=\"fixed inset-0 bg-black/50 flex items-start justify-center pt-32 z-50\">
      <div 
        className=\"bg-dark-800 border border-dark-600 rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-96 flex flex-col\"\n        onClick={(e) => e.stopPropagation()}\n      >\n        {/* Header */}\n        <div className=\"flex items-center justify-between p-4 border-b border-dark-700\">\n          <div className=\"flex items-center space-x-2\">\n            <span className=\"text-moonlock-400 text-lg\">⌘</span>\n            <h3 className=\"text-lg font-semibold text-white\">Command Palette</h3>\n          </div>\n          <button\n            onClick={onClose}\n            className=\"text-dark-400 hover:text-white transition-colors\"\n          >\n            ✕\n          </button>\n        </div>\n\n        {/* Search Input */}\n        <div className=\"p-4 border-b border-dark-700\">\n          <div className=\"relative\">\n            <input\n              ref={inputRef}\n              type=\"text\"\n              value={query}\n              onChange={(e) => setQuery(e.target.value)}\n              onKeyDown={handleKeyDown}\n              placeholder=\"Type a command name or search...\"\n              className=\"w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-dark-400 focus:border-moonlock-500 focus:outline-none\"\n              disabled={isExecuting}\n            />\n            <div className=\"absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400 text-sm\">\n              {filteredCommands.length} commands\n            </div>\n          </div>\n        </div>\n\n        {/* Error Display */}\n        {error && (\n          <div className=\"px-4 py-2 bg-red-500/10 border-b border-red-500/20\">\n            <p className=\"text-red-400 text-sm\">⚠️ {error}</p>\n          </div>\n        )}\n\n        {/* Command List */}\n        <div className=\"flex-1 overflow-y-auto\" ref={commandListRef}>\n          {filteredCommands.length === 0 ? (\n            <div className=\"p-8 text-center\">\n              <div className=\"text-dark-400 mb-2 text-4xl\">🔍</div>\n              <p className=\"text-dark-400 mb-1\">\n                {query ? 'No commands found' : 'No recent commands'}\n              </p>\n              <p className=\"text-dark-500 text-sm\">\n                {query ? 'Try a different search term' : 'Execute some commands to see them here'}\n              </p>\n            </div>\n          ) : (\n            <div className=\"py-2\">\n              {!query && recentCommands.length > 0 && (\n                <div className=\"px-4 py-2 border-b border-dark-700\">\n                  <p className=\"text-xs text-dark-400 uppercase tracking-wide font-medium\">\n                    Recent Commands\n                  </p>\n                </div>\n              )}\n              \n              {filteredCommands.map((match, index) => (\n                <div\n                  key={match.command.command}\n                  className={`px-4 py-3 cursor-pointer border-l-2 transition-all ${\n                    index === selectedIndex\n                      ? 'bg-moonlock-600/20 border-moonlock-500 bg-dark-700'\n                      : 'border-transparent hover:bg-dark-700/50'\n                  }`}\n                  onClick={() => handleExecuteCommand(match.command)}\n                >\n                  <div className=\"flex items-center justify-between mb-1\">\n                    <div className=\"flex items-center space-x-3\">\n                      <span className=\"text-lg\">\n                        {getCategoryIcon(match.command.category)}\n                      </span>\n                      <code className=\"text-moonlock-400 font-mono font-medium\">\n                        {highlightMatch(match.command.command, query)}\n                      </code>\n                      {match.command.args && match.command.args.length > 0 && (\n                        <span className=\"text-dark-400 text-sm font-mono\">\n                          {match.command.args.map(arg => `<${arg}>`).join(' ')}\n                        </span>\n                      )}\n                    </div>\n                    \n                    <div className=\"flex items-center space-x-2\">\n                      <span className={`text-xs px-2 py-1 rounded-full bg-dark-600 ${getCategoryColor(match.command.category)}`}>\n                        {match.command.category}\n                      </span>\n                      {index === selectedIndex && (\n                        <span className=\"text-xs text-dark-400\">↵</span>\n                      )}\n                    </div>\n                  </div>\n                  \n                  <p className=\"text-sm text-dark-300 ml-8\">\n                    {highlightMatch(match.command.description, query)}\n                  </p>\n                </div>\n              ))}\n            </div>\n          )}\n        </div>\n\n        {/* Footer */}\n        <div className=\"px-4 py-3 border-t border-dark-700 bg-dark-800/50\">\n          <div className=\"flex items-center justify-between text-xs text-dark-400\">\n            <div className=\"flex items-center space-x-4\">\n              <span>↑↓ Navigate</span>\n              <span>↵ Execute</span>\n              <span>Tab Complete</span>\n              <span>Esc Close</span>\n            </div>\n            {isExecuting && (\n              <div className=\"flex items-center space-x-2\">\n                <div className=\"animate-spin w-3 h-3 border border-moonlock-500 border-t-transparent rounded-full\"></div>\n                <span>Executing...</span>\n              </div>\n            )}\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n};