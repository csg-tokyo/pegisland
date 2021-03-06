// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { InitialPegBuilder, SimpleTree } from './InitialPegBuilder';
import { ParsingError, PegInterpreter } from './PegInterpreter';
import { IParseTree } from './ParseTree';

const grammar: { [name: string]: SimpleTree } = {
  grammar: ['', 'Spacing', ['+', 'Definition']],
  Definition: ['', 'Identifier', 'LEFTARROW', 'Expression', ['?', 'SEMICOLON']],
  Expression: ['', 'Rewriting', ['*', ['', 'SLASH', 'Rewriting']]],
  Rewriting: ['', 'Sequence', ['?', ['', 'RIGHTARROW', 'String']]],
  Sequence: ['*', ['', 'Prefix', ['!', 'LEFTARROW']]],
  Prefix: ['', ['?', ['/', 'AND', 'NOT']], 'Suffix'],
  Suffix: ['', 'Primary', ['*', ['/', 'QUESTION', 'STAR', 'PLUS']]],
  Primary: [
    '/',
    'Regexp',
    'NamedItendifier',
    ['', 'OPEN', 'Expression', 'CLOSE'],
    'String',
    'Class',
    'DOT',
  ],
  NamedItendifier: [
    '',
    [
      '?',
      [
        '',
        ['terminal', /[a-zA-Z][a-zA-Z0-9_]*|<[a-zA-Z][a-zA-Z0-9_]*>/],
        ['terminal', /:/],
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
  Class: ['', ['terminal', /\[[^\]]+\]/], 'Spacing'],
  Char: [
    '/',
    ['terminal', /\\[nrt'"[\]\\]/],
    ['terminal', /\\[0-2][0-7][0-7]/],
    ['terminal', /\\[0-7][0-7]?/],
    ['terminal', /[^\\]/],
  ],
  LEFTARROW: ['', ['terminal', /=|<-/], 'Spacing'],
  RIGHTARROW: ['', ['terminal', /->/], 'Spacing'],
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
  DOT: ['', ['terminal', /\.|_/], 'Spacing'],
  Spacing: ['*', ['/', 'Space', 'Comment']],
  Space: ['terminal', /\s+/],
  Comment: ['terminal', /\/\/.*?$/],
};

export class PegParser {
  pegInterpreter: PegInterpreter;
  constructor() {
    const builder = new InitialPegBuilder();
    const rules = builder.build(grammar);
    this.pegInterpreter = new PegInterpreter(builder.rules);
  }

  parse(s: string): IParseTree | ParsingError | Error {
    return this.pegInterpreter.parse(s, 'grammar');
  }
}
