// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { InitialPegBuilder } from './InitialPegBuilder';
import { PackratParser, ParsingError } from './PackratParser';
import { IParseTree } from './ParseTree';

export type SimpleTree =
  | Nonterminals
  | ['terminal', RegExp | string]
  | ['' | '/', ...SimpleTree[]]
  | ['*' | '+' | '?' | '!' | '&', SimpleTree];

export type Nonterminals =
  | 'AND'
  | 'Char'
  | 'Class'
  | 'CLOSE'
  | 'COLON'
  | 'COLON_NOT'
  | 'Comment'
  | 'DOT'
  | 'Definition'
  | 'Expression'
  | 'grammar'
  | 'Identifier'
  | 'LAKE_CLOSE'
  | 'LAKE_OPEN'
  | 'LEFT_ARROW'
  | 'NamedIdentifier'
  | 'NOT'
  | 'OPEN'
  | 'OptAnnotations'
  | 'PLUS'
  | 'PLUS_PLUS'
  | 'Primary'
  | 'Prefix'
  | 'QUESTION'
  | 'Regexp'
  | 'Rewriting'
  | 'RIGHT_ARROW'
  | 'SEMICOLON'
  | 'Sequence'
  | 'SLASH'
  | 'Space'
  | 'Spacing'
  | 'STAR'
  | 'STAR_PLUS'
  | 'String'
  | 'Suffix';

const grammar: { [name in Nonterminals]: SimpleTree } = {
  grammar: ['', 'Spacing', ['+', 'Definition']],
  OptAnnotations: ['*', ['terminal', /@water\s*/]],
  Definition: [
    '',
    'OptAnnotations',
    'Identifier',
    'LEFT_ARROW',
    'Expression',
    ['?', 'SEMICOLON'],
  ],
  Expression: ['', 'Rewriting', ['*', ['', 'SLASH', 'Rewriting']]],
  Rewriting: ['', 'Sequence', ['?', ['', 'RIGHT_ARROW', 'String']]],
  Sequence: ['*', ['', 'Prefix', ['!', 'LEFT_ARROW']]],
  Prefix: ['', ['?', ['/', 'AND', 'NOT']], 'Suffix'],
  Suffix: [
    '',
    'Primary',
    [
      '?',
      [
        '/',
        ['', 'STAR_PLUS', 'Primary'],
        ['', 'PLUS_PLUS', 'Primary'],
        ['', 'COLON_NOT', 'Primary'],
        ['', 'COLON', 'Primary'],
        'QUESTION',
        'STAR',
        'PLUS',
      ],
    ],
  ],
  Primary: [
    '/',
    'Regexp',
    ['', 'LAKE_OPEN', 'Expression', 'LAKE_CLOSE'],
    'NamedIdentifier',
    ['', 'OPEN', 'Expression', 'CLOSE'],
    'String',
    'Class',
    'DOT',
  ],
  NamedIdentifier: [
    '',
    [
      '?',
      [
        '',
        ['terminal', /[a-zA-Z][a-zA-Z0-9_]*|<[a-zA-Z][a-zA-Z0-9_]*>/],
        ['terminal', /@/],
      ],
    ],
    'Identifier',
  ],
  Identifier: [
    '',
    ['terminal', /[a-zA-Z][a-zA-Z0-9_]*|<[a-zA-Z][a-zA-Z0-9_]*>/],
    'Spacing',
  ],
  String: [
    '',
    ['/', ['terminal', /"(\\.|[^"])+"/], ['terminal', /'(\\.|[^'])+'/]],
    'Spacing',
  ],
  Regexp: [
    '',
    ['/', ['terminal', /r"(\\.|[^"])+"/], ['terminal', /r'(\\.|[^'])+'/]],
    'Spacing',
  ],
  Class: ['', ['terminal', /\^?\[[^\]]+\]/], 'Spacing'],
  Char: [
    '/',
    ['terminal', /\\[nrt'"[\]\\]/],
    ['terminal', /\\[0-2][0-7][0-7]/],
    ['terminal', /\\[0-7][0-7]?/],
    ['terminal', /[^\\]/],
  ],
  LEFT_ARROW: ['', ['terminal', /=|<-/], 'Spacing'],
  RIGHT_ARROW: ['', ['terminal', /->/], 'Spacing'],
  SEMICOLON: ['', ['terminal', /;/], 'Spacing'],
  SLASH: ['', ['terminal', /\//], 'Spacing'],
  AND: ['', ['terminal', /&/], 'Spacing'],
  NOT: ['', ['terminal', /!/], 'Spacing'],
  QUESTION: ['', ['terminal', /\?/], 'Spacing'],
  STAR_PLUS: ['', ['terminal', /\*\+/], 'Spacing'],
  PLUS_PLUS: ['', ['terminal', /\+\+/], 'Spacing'],
  STAR: ['', ['terminal', /\*/], 'Spacing'],
  PLUS: ['', ['terminal', /\+/], 'Spacing'],
  OPEN: ['', ['terminal', /\(/], 'Spacing'],
  CLOSE: ['', ['terminal', /\)/], 'Spacing'],
  LAKE_OPEN: ['', ['terminal', /<</], 'Spacing'],
  LAKE_CLOSE: ['', ['terminal', />>/], 'Spacing'],
  DOT: ['', ['terminal', /\.|_/], 'Spacing'],
  COLON: ['', ['terminal', /:/], 'Spacing'],
  COLON_NOT: ['', ['terminal', /:!/], 'Spacing'],
  Spacing: ['*', ['/', 'Space', 'Comment']],
  Space: ['terminal', /\s+/],
  Comment: ['terminal', /\/\/.*?$/],
};

export class PegParser {
  pegInterpreter: PackratParser;
  constructor() {
    const builder = new InitialPegBuilder();
    const rules = builder.build(grammar);
    this.pegInterpreter = new PackratParser(rules);
  }

  parse(s: string): IParseTree | ParsingError | Error {
    return this.pegInterpreter.parse(s, 'grammar');
  }
}
