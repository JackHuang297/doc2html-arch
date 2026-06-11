export interface AudienceRule {
  audience: string;
  condition?: (data: any) => boolean;
}

export class AudienceFilter {
  private audiences: Set<string> = new Set(['all', 'admin', 'user', 'guest']);
  private rules: Map<string, AudienceRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.rules.set('all', { audience: 'all' });
    this.rules.set('admin', { audience: 'admin' });
    this.rules.set('user', { audience: 'user' });
    this.rules.set('guest', { audience: 'guest' });
  }

  registerAudience(audience: string, rule?: AudienceRule): void {
    this.audiences.add(audience);
    if (rule) {
      this.rules.set(audience, rule);
    }
  }

  filter(data: any, requestedAudiences: string[]): any {
    if (!data.sections) return data;

    const filteredSections = data.sections.filter((section: any) => {
      if (!section.audiences || section.audiences.length === 0) {
        return true;
      }
      return requestedAudiences.some(aud => 
        section.audiences.includes(aud) || section.audiences.includes('all')
      );
    }).map((section: any) => {
      if (section.content && Array.isArray(section.content)) {
        section.content = section.content.filter((item: any) => {
          if (!item.audiences || item.audiences.length === 0) {
            return true;
          }
          return requestedAudiences.some(aud =>
            item.audiences.includes(aud) || item.audiences.includes('all')
          );
        });
      }
      return section;
    });

    return { ...data, sections: filteredSections };
  }

  getAvailableAudiences(): string[] {
    return Array.from(this.audiences);
  }

  isAudienceAllowed(audience: string): boolean {
    return this.audiences.has(audience);
  }
}
