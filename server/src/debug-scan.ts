import * as fs from 'fs';
import { CreateDefaultScanner } from './scanner/impl/generateScanner';
import { SyntaxKind } from './dataClasses';

const text = fs.readFileSync('/devel/cp_linux/som-external/board/carbon/configs/sw-description-nand', 'utf8');
const scanner = CreateDefaultScanner(text, false);

let kind: SyntaxKind;
while ((kind = scanner.scan()) !== SyntaxKind.EOF) {
  const name = SyntaxKind[kind];
  const value = scanner.getTokenValue();
  if (kind === SyntaxKind.StringLiteral || 
      kind === SyntaxKind.NumericLiteral ||
      kind === SyntaxKind.TrueKeyword ||
      kind === SyntaxKind.FalseKeyword ||
      kind === SyntaxKind.PropertyName) {
    console.log(`${name.padEnd(20)} | "${value}"`);
  }
}
