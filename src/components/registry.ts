export interface ComponentDefinition {
  id: string;
  name: string;
  template: string;
  props: Record<string, any>;
  audiences?: string[];
  version: string;
  dependencies?: string[];
}

export class ComponentRegistry {
  private components: Map<string, ComponentDefinition> = new Map();
  private aliases: Map<string, string> = new Map();

  register(component: ComponentDefinition): void {
    this.components.set(component.id, component);
  }

  registerAlias(alias: string, componentId: string): void {
    this.aliases.set(alias, componentId);
  }

  get(componentId: string): ComponentDefinition | undefined {
    const actualId = this.aliases.get(componentId) || componentId;
    return this.components.get(actualId);
  }

  getAll(): ComponentDefinition[] {
    return Array.from(this.components.values());
  }

  exists(componentId: string): boolean {
    return this.components.has(componentId) || this.aliases.has(componentId);
  }

  delete(componentId: string): boolean {
    return this.components.delete(componentId);
  }

  clear(): void {
    this.components.clear();
    this.aliases.clear();
  }
}
