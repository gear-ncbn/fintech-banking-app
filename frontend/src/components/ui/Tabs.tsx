'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion } from 'framer-motion';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabGroupProps {
  children: React.ReactNode;
  defaultTab?: string;
  onChange?: (tab: string) => void;
  className?: string;
  analyticsId?: string;
}

interface TabProps {
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabGroup: React.FC<TabGroupProps> = ({
  children,
  defaultTab,
  onChange,
  className = '',
  analyticsId = 'tab-group',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || '');

  useEffect(() => {
    // Set default tab if not provided
    if (!defaultTab && !activeTab) {
      const firstTab = React.Children.toArray(children).find(
        (child) => React.isValidElement(child) && child.type === TabList
      );
      if (firstTab && React.isValidElement(firstTab)) {
        const firstTabValue = React.Children.toArray((firstTab.props as { children?: React.ReactNode }).children)
          .find((tab) => React.isValidElement(tab) && tab.type === Tab);
        if (firstTabValue && React.isValidElement(firstTabValue)) {
          const initialTab = (firstTabValue.props as { value?: string }).value;
          if (initialTab) setActiveTab(initialTab);
        }
      }
    }
  }, [defaultTab, activeTab, children, analyticsId]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={`tabs-container ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

interface TabListProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export const TabList: React.FC<TabListProps> = ({
  children,
  className = '',
  variant = 'default',
}) => {
  const variantClasses = {
    default: 'flex gap-1 p-1 bg-[rgba(var(--glass-rgb),0.2)] rounded-lg',
    pills: 'flex gap-2',
    underline: 'flex gap-4 border-b border-[var(--border-1)]',
  };

  return (
    <div className={`${variantClasses[variant]} ${className}`} role="tablist">
      {children}
    </div>
  );
};

export const Tab: React.FC<TabProps> = ({
  value,
  children,
  icon,
  badge,
  disabled = false,
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab must be used within TabGroup');
  }

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={`
        relative px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isActive
          ? 'bg-[rgba(var(--glass-rgb),0.95)] text-[var(--text-1)] shadow-sm'
          : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[rgba(var(--glass-rgb),0.1)]'
        }
      `}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-inherit">{icon}</span>}
        {children}
        {badge && (
          <span className={`
            px-1.5 py-0.5 text-xs rounded-full
            ${isActive
              ? 'bg-[var(--primary-blue)] text-white'
              : 'bg-[rgba(var(--glass-rgb),0.3)] text-[var(--text-2)]'
            }
          `}>
            {badge}
          </span>
        )}
      </div>
      {isActive && (
        <motion.div
          layoutId="active-tab-indicator"
          className="absolute inset-0 rounded-lg border border-[var(--border-2)]"
          transition={{ type: 'spring', duration: 0.3 }}
        />
      )}
    </button>
  );
};

export const TabPanel: React.FC<TabPanelProps> = ({
  value,
  children,
  className = '',
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabPanel must be used within TabGroup');
  }

  const { activeTab } = context;

  if (activeTab !== value) {
    return null;
  }

  return (
    <motion.div
      id={`tabpanel-${value}`}
      role="tabpanel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const Tabs = { TabGroup, TabList, Tab, TabPanel };
export default Tabs;
