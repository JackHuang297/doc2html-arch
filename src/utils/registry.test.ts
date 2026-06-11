import { ComponentRegistry } from '../components/registry';

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;

  beforeEach(() => {
    registry = new ComponentRegistry();
  });

  it('should register a component', () => {
    const component = {
      id: 'test-component',
      name: 'Test Component',
      template: '<div>Test</div>',
      props: {},
      version: '1.0.0'
    };
    registry.register(component);

    expect(registry.get('test-component')).toBeDefined();
    expect(registry.get('test-component')!.id).toBe('test-component');
  });

  it('should retrieve a registered component', () => {
    const component = {
      id: 'my-component',
      name: 'My Component',
      template: '<div>Test</div>',
      props: {},
      version: '1.0.0'
    };
    registry.register(component);

    const retrieved = registry.get('my-component');
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe('my-component');
  });

  it('should return undefined for unregistered component', () => {
    const result = registry.get('non-existent');
    expect(result).toBeUndefined();
  });

  it('should check if component exists', () => {
    const component = {
      id: 'exists',
      name: 'Exists',
      template: '<div>Test</div>',
      props: {},
      version: '1.0.0'
    };
    registry.register(component);

    expect(registry.exists('exists')).toBe(true);
    expect(registry.exists('missing')).toBe(false);
  });

  it('should get all registered components', () => {
    registry.register({ id: 'comp1', name: 'C1', template: '', props: {}, version: '1.0.0' });
    registry.register({ id: 'comp2', name: 'C2', template: '', props: {}, version: '1.0.0' });

    const all = registry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('should list component ids', () => {
    registry.register({ id: 'header', name: 'Header', template: '', props: {}, version: '1.0.0' });
    registry.register({ id: 'footer', name: 'Footer', template: '', props: {}, version: '1.0.0' });

    const all = registry.getAll();
    const ids = all.map(c => c.id);
    expect(ids).toContain('header');
    expect(ids).toContain('footer');
  });

  it('should delete a component', () => {
    registry.register({ id: 'to-delete', name: 'Delete', template: '', props: {}, version: '1.0.0' });
    expect(registry.exists('to-delete')).toBe(true);

    const deleted = registry.delete('to-delete');
    expect(deleted).toBe(true);
    expect(registry.exists('to-delete')).toBe(false);
  });

  it('should clear all components', () => {
    registry.register({ id: 'c1', name: 'C1', template: '', props: {}, version: '1.0.0' });
    registry.register({ id: 'c2', name: 'C2', template: '', props: {}, version: '1.0.0' });

    registry.clear();
    expect(registry.getAll().length).toBe(0);
  });
});