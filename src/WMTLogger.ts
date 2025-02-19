//
// Copyright 2024 Wultra s.r.o.
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

import { WMTException } from "./WMTException"

/**
 * How much should Mobile Token library log into the console.
 */
export enum WMTLoggerVerbosity {
    /** No logs will be printed. */
    NONE    = 0,
    /** Only errors will be printed into the console. */
    ERROR   = 1,
    /** Warnings and errors will be printed into the console. */
    WARN    = 2,
    /** Info logs, warnings and errors will be printed into the console. */
    INFO    = 3,
    /** All but debug messages will be printed into the console. */
    VERBOSE = 4,
    /** All logs are on. */
    DEBUG   = 5
}

/**
 * Mobile Token logging utility.
 */
export class WMTLogger {

    /** Which level of logs (and lower) should be logged into the console. Default value is `WARN`. */
    public static verbosity: WMTLoggerVerbosity = WMTLoggerVerbosity.WARN

    /** Include time in the logs? */
    public static includeTime: boolean = true

    static debug(message: string | any) {
        this.log(message, WMTLoggerVerbosity.DEBUG)
    }

    static info(message: string | any) {
        this.log(message, WMTLoggerVerbosity.INFO)
    }

    static warn(message: string | any) {
        this.log(message, WMTLoggerVerbosity.WARN)
    }

    static verbose(message: string | any) {
        this.log(message, WMTLoggerVerbosity.VERBOSE)
    }

    static error(message: string | any) {
        this.log(message, WMTLoggerVerbosity.ERROR)
    }

    static errorAndException(message: string): WMTException {
        this.log(message, WMTLoggerVerbosity.ERROR)
        return new WMTException(message)
    }

    private static log(message: string | any, level: WMTLoggerVerbosity) {

        if (this.verbosity >= level) {

            let lvl: string

            switch (level) {
                case WMTLoggerVerbosity.DEBUG:
                    lvl = "DBG"
                    break
                case WMTLoggerVerbosity.INFO:
                    lvl = "INF"
                    break
                case WMTLoggerVerbosity.WARN:
                    lvl = "WRN"
                    break
                case WMTLoggerVerbosity.ERROR:
                    lvl = "ERR"
                    break
                case WMTLoggerVerbosity.VERBOSE:
                    lvl = "VBS"
                    break
                default:
                    lvl = "UKN"
                    break
            }

            console.log(`[WMT:${lvl}${this.includeTime ? " - " + new Date().toISOString() : ""}] ${message}`)
        }
    }
}
