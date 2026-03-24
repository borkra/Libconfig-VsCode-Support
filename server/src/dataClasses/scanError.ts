// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 LibConfig VS Code Support contributors
'use strict';

export enum ScanError {
	None = 0,
	UnexpectedEndOfComment,
	UnexpectedEndOfString,
	UnexpectedEndOfNumber,
	InvalidUnicode,
	InvalidEscapeCharacter,
	InvalidCharacter,
	UnexpectedEndOfPropertyName
}
