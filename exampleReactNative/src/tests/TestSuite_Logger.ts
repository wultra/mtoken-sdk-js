//
// Copyright 2025 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions
// and limitations under the License.
//

import { WMTLogger, WMTLoggerVerbosity } from 'react-native-mtoken-sdk';
import { TestSuite } from './TestSuite';

/**
 * Test suite for WMTLogger and its listener behavior.
 */
export class TestSuite_Logger extends TestSuite {

    /**
     * Helper listener capturing the last message and verbosity.
     * Values are cleared on read to mimic single-read behavior.
     */
    private logListenerFactory() {
        return new class {
            private _lastMessage: string | null = null;
            private _lastVerbosity: WMTLoggerVerbosity | null = null;

            get lastMessage(): string | null {
                const m = this._lastMessage;
                this._lastMessage = null;
                return m;
            }

            get lastVerbosity(): WMTLoggerVerbosity | null {
                const v = this._lastVerbosity;
                this._lastVerbosity = null;
                return v;
            }

            startListening(followVerbosity: boolean) {
                WMTLogger.setLogListener((message: string, verbosity: WMTLoggerVerbosity) => {
                    this._lastMessage = message;
                    this._lastVerbosity = verbosity;
                }, followVerbosity);
            }

            stopListening() {
                WMTLogger.setLogListener(null);
            }
        }();
    }

    testListener() {
        // Preserve previous global logger settings
        const originalVerbosity = WMTLogger.verbosity;
        const originalIncludeTime = WMTLogger.includeTime;

        WMTLogger.includeTime = false;

        const listener = this.logListenerFactory();

        try {
            // Start listening with verbosity following
            listener.startListening(true);

            WMTLogger.verbosity = WMTLoggerVerbosity.NONE;
            WMTLogger.debug('Debug message');
            this.assertNull(listener.lastMessage);
            this.assertNull(listener.lastVerbosity);

            WMTLogger.verbosity = WMTLoggerVerbosity.DEBUG;
            WMTLogger.debug('Debug message');
            this.assertEquals('Debug message', listener.lastMessage);
            this.assertEquals(WMTLoggerVerbosity.DEBUG, listener.lastVerbosity);

            WMTLogger.verbosity = WMTLoggerVerbosity.INFO;
            WMTLogger.debug('Debug message');
            this.assertNull(listener.lastMessage);
            this.assertNull(listener.lastVerbosity);

            WMTLogger.verbosity = WMTLoggerVerbosity.INFO;
            WMTLogger.info('Info message');
            this.assertEquals('Info message', listener.lastMessage);
            this.assertEquals(WMTLoggerVerbosity.INFO, listener.lastVerbosity);

            WMTLogger.error('Error message');
            this.assertEquals('Error message', listener.lastMessage);
            this.assertEquals(WMTLoggerVerbosity.ERROR, listener.lastVerbosity);

            WMTLogger.debug('Debug message');
            this.assertNull(listener.lastMessage);
            this.assertNull(listener.lastVerbosity);

            // Stop listening
            listener.stopListening();

            // Start listening with verbosity, not following
            listener.startListening(false);
            WMTLogger.verbosity = WMTLoggerVerbosity.NONE;
            WMTLogger.info('Info message');
            this.assertEquals('Info message', listener.lastMessage);
            this.assertEquals(WMTLoggerVerbosity.INFO, listener.lastVerbosity);

            // Stop listening
            listener.stopListening();
            WMTLogger.verbosity = WMTLoggerVerbosity.NONE;
            WMTLogger.info('Info message');
            this.assertNull(listener.lastMessage);
            this.assertNull(listener.lastVerbosity);
        } finally {
            // Restore defaults to avoid affecting other tests
            listener.stopListening();
            WMTLogger.verbosity = originalVerbosity;
            WMTLogger.includeTime = originalIncludeTime;
        }
    }
}
