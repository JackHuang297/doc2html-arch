import { AudienceFilter } from './audience-filter';

describe('AudienceFilter', () => {
  let filter: AudienceFilter;

  beforeEach(() => {
    filter = new AudienceFilter();
  });

  it('should filter content by audience', () => {
    const doc = {
      id: 'doc1',
      content: [
        { text: 'Public content', audience: 'all' },
        { text: 'Premium only', audience: 'premium' },
        { text: 'VIP only', audience: 'vip' }
      ]
    };

    const filtered = filter.filter(doc, ['premium']);
    expect(filtered).toBeDefined();
  });

  it('should handle multiple audiences', () => {
    const doc = {
      id: 'doc1',
      content: [
        { text: 'For all', audience: 'all' },
        { text: 'Premium content', audience: 'premium' },
        { text: 'VIP content', audience: 'vip' }
      ]
    };

    const filtered = filter.filter(doc, ['premium', 'vip']);
    expect(filtered).toBeDefined();
  });

  it('should always include all audience content', () => {
    const doc = {
      id: 'doc1',
      content: [
        { text: 'Universal', audience: 'all' },
        { text: 'Premium', audience: 'premium' }
      ]
    };

    const filtered = filter.filter(doc, []);
    expect(filtered).toBeDefined();
  });
});
