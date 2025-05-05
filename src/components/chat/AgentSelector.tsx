'use client';

import * as React from "react";
import { Plane, Cog, Users, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Define the structure for an agent
export interface Agent {
  id: string;
  name: string;
  icon: React.ElementType;
}

// Define the list of available agents
export const agents: Agent[] = [
  {
    id: "foncorp-travel-agent",
    name: "Agente de Viajes Foncorp",
    icon: Plane,
  },
  {
    id: "foncorp-it-support-agent",
    name: "Agente de Soporte IT",
    icon: Cog,
  },
  {
    id: "foncorp-hr-agent",
    name: "Agente de Recursos Humanos",
    icon: Users,
  },
];

interface AgentSelectorProps {
  selectedAgent: Agent;
  onAgentSelect: (agentId: string) => void;
  className?: string;
}

export function AgentSelector({
  selectedAgent,
  onAgentSelect,
  className,
}: AgentSelectorProps) {
  const SelectedIcon = selectedAgent.icon;

  return (
    <Select value={selectedAgent.id} onValueChange={onAgentSelect}>
      <SelectTrigger
        className={cn(
          "w-auto min-w-[200px] h-10 flex items-center gap-2",
          className
        )}
      >
        <SelectedIcon className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Select agent" className="flex-1" />
      </SelectTrigger>
      <SelectContent>
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{agent.name}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
