import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lb = readFileSync('lake-buildings.html', 'utf8');
const lp = readFileSync('lake-premix-cement.html', 'utf8');

describe('Lake Building Solution source lock', () => {
  it('uses correct company name', () => {
    assert.ok(lb.includes('Lake Building Solution'), 'Lake Building Solution present');
    assert.ok(!lb.includes('Lake Buildings Solutions'), 'No old "Lake Buildings Solutions"');
  });

  it('uses approved factory hero image', () => {
    assert.ok(lb.includes('building-factory-hero.webp'), 'Factory hero image');
    assert.ok(!lb.includes("gccp/photo_1.jpg"), 'No old GCCP hero');
  });

  it('contains source-backed products', () => {
    assert.ok(lb.includes('Gypsum Board'), 'Gypsum Board present');
    assert.ok(lb.includes('Marine Board'), 'Marine Board present');
    assert.ok(lb.includes('1220 mm'), 'Board dimensions present');
    assert.ok(lb.includes('19.2'), 'Gypsum weight present');
    assert.ok(lb.includes('34 kg'), 'Marine weight present');
  });

  it('does NOT contain old AI products', () => {
    assert.ok(!lb.includes('Concrete Blocks'), 'No Concrete Blocks');
    assert.ok(!lb.includes('Precast Elements'), 'No Precast Elements');
    assert.ok(!lb.includes('Water Storage Tanks'), 'No Water Storage Tanks');
  });

  it('does NOT contain Operations by Country', () => {
    assert.ok(!lb.includes('Operations by Country'), 'No Operations by Country card');
  });

  it('has source-backed mission and vision', () => {
    assert.ok(lb.includes('high-quality gypsum boards'), 'Mission mentions gypsum boards');
    assert.ok(lb.includes('innovative industrial company'), 'Vision mentions innovative industrial');
  });

  it('has source-backed core values', () => {
    assert.ok(lb.includes('Customer Service'), 'Value: Customer Service');
    assert.ok(lb.includes('Environmental Stewardship'), 'Value: Environmental Stewardship');
    assert.ok(lb.includes('Teamwork'), 'Value: Teamwork');
  });

  it('has source-backed location', () => {
    assert.ok(lb.includes('Kibaha'), 'Kibaha location');
    assert.ok(lb.includes('100+'), '100+ employees');
  });

  it('no old hero image reference', () => {
    assert.ok(!lb.includes('photo_1.jpg'), 'No GCCP photo_1 hero');
  });
});

describe('Lake Premix source lock', () => {
  it('uses correct company name', () => {
    assert.ok(lp.includes('Lake Premix'), 'Lake Premix present');
  });

  it('uses approved truck hero image', () => {
    assert.ok(lp.includes('premix-trucks-hero.webp'), 'Trucks hero image');
    assert.ok(!lp.includes("gccp/photo_1.jpg"), 'No old GCCP hero');
  });

  it('contains source-backed fleet figures', () => {
    assert.ok(lp.includes('30'), '30 mixer trucks');
    assert.ok(lp.includes('Mixer Trucks'), 'Mixer Trucks label');
    assert.ok(lp.includes('5') && lp.includes('Boom Pump'), '5 boom pump trucks');
    assert.ok(lp.includes('3') && lp.includes('Line Pump'), '3 line pump trucks');
  });

  it('contains source-backed batching plants', () => {
    assert.ok(lp.includes('Mikocheni'), 'Mikocheni batching plant');
    assert.ok(lp.includes('Temeke'), 'Temeke batching plant');
    assert.ok(lp.includes('SANY International'), 'SANY equipment');
    assert.ok(lp.includes('240 tons'), 'Silo capacity');
  });

  it('contains concrete grades C10-C55', () => {
    assert.ok(lp.includes('C10'), 'C10 grade');
    assert.ok(lp.includes('C55'), 'C55 grade');
  });

  it('contains source-backed products', () => {
    assert.ok(lp.includes('Ultra-Rapid Hardening'), 'Ultra-Rapid product');
    assert.ok(lp.includes('Crack-Resistant'), 'Crack-Resistant product');
    assert.ok(lp.includes('Self-Consolidating'), 'SCC product');
    assert.ok(lp.includes('Architectural Concrete'), 'Architectural product');
  });

  it('has Tanzania + Kenya operations', () => {
    assert.ok(lp.includes('Tanzania'), 'Tanzania operations');
    assert.ok(lp.includes('Kenya'), 'Kenya operations');
    assert.ok(lp.includes('Gulf Premix'), 'Gulf Premix Kenya');
  });

  it('has established year 2010', () => {
    assert.ok(lp.includes('2010'), 'Established 2010');
  });

  it('has quarry information', () => {
    assert.ok(lp.includes('Lugoba'), 'Lugoba quarry');
  });

  it('has source-backed mission and vision', () => {
    assert.ok(lp.includes('highly durable concrete'), 'Mission: durable concrete');
    assert.ok(lp.includes('market leader'), 'Vision: market leader');
  });

  it('has source-backed values', () => {
    assert.ok(lp.includes('Quality'), 'Value: Quality');
    assert.ok(lp.includes('Commitment'), 'Value: Commitment');
    assert.ok(lp.includes('Innovation'), 'Value: Innovation');
  });

  it('no old stat panels', () => {
    assert.ok(!lp.includes('Ready-Mix Capacity'), 'No old stat panel heading');
    assert.ok(!lp.includes('Building East Africa'), 'No generic AI heading');
  });

  it('no encoding corruption', () => {
    assert.ok(!lp.includes('\ufffd'), 'No replacement characters');
  });
});
