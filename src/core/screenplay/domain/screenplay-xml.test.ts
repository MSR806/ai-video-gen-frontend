import { describe, expect, it } from 'bun:test';
import { canonicalizeSceneXml, parseSceneXmlBlocks, validateSceneXml } from './screenplay-xml';

describe('screenplay-xml validation parity', () => {
  const invalidCases = [
    {
      name: 'invalid root tag',
      xml: '<sequence><action>Hello</action></sequence>',
    },
    {
      name: 'attributes on tags',
      xml: '<scene><action style="loud">Hello</action></scene>',
    },
    {
      name: 'nested elements',
      xml: '<scene><action><em>Hello</em></action></scene>',
    },
    {
      name: 'comments',
      xml: '<scene><!-- note --><action>Hello</action></scene>',
    },
    {
      name: 'malformed xml',
      xml: '<scene><action>Hello</scene>',
    },
    {
      name: 'text outside allowed block tags',
      xml: '<scene>Outside<action>Hello</action></scene>',
    },
  ] as const;

  invalidCases.forEach(({ name, xml }) => {
    it(`rejects ${name}`, () => {
      const validation = validateSceneXml(xml);
      expect(validation.isValid).toBeFalse();
      expect(validation.error).toBeString();
      expect(() => parseSceneXmlBlocks(xml)).toThrow();
      expect(() => canonicalizeSceneXml(xml)).toThrow();
    });
  });

  it('canonicalizes valid scene xml', () => {
    const xml = '<scene><slugline>INT. LAB - DAY</slugline><action>Power hums.</action></scene>';

    expect(validateSceneXml(xml).isValid).toBeTrue();
    expect(canonicalizeSceneXml(xml)).toBe(xml);
  });
});
