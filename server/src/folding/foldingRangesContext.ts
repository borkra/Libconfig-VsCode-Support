// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 LibConfig VS Code Support contributors
'use strict';

export interface FoldingRangesContext {
	/**
	 * The maximal number of ranges returned.
	 */
	rangeLimit?: number;
	/**
	 * Called when the result was cropped.
	 */
	onRangeLimitExceeded?: (uri: string) => void;
}