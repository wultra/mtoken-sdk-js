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

export enum MobileTokenLoggerVerbosity {
    NONE  = 0,
    ERROR = 1,
    WARN  = 2,
    INFO  = 3,
    DEBUG = 4
}

export class MobileTokenLogger {

    public static verbosity: MobileTokenLoggerVerbosity = MobileTokenLoggerVerbosity.WARN
    public static includeTime: boolean = true


    static debug(message: string | any) {
        this.log(message, MobileTokenLoggerVerbosity.DEBUG)
    }

    static info(message: string | any) {
        this.log(message, MobileTokenLoggerVerbosity.INFO)
    }
    

    static warn(message: string | any) {
        this.log(message, MobileTokenLoggerVerbosity.WARN)
    }

    static error(message: string | any) {
        this.log(message, MobileTokenLoggerVerbosity.ERROR)
    }

    private static log(message: string | any, level: MobileTokenLoggerVerbosity) {
        if (this.verbosity >= level) {

            let lvl: string
            switch (level) {
                case MobileTokenLoggerVerbosity.DEBUG:
                    lvl = "DBG"
                    break
                case MobileTokenLoggerVerbosity.INFO:
                    lvl = "INF"
                    break
                case MobileTokenLoggerVerbosity.WARN:
                    lvl = "WRN"
                    break
                case MobileTokenLoggerVerbosity.ERROR:
                    lvl = "ERR"
                    break
                default:
                    lvl = "UKN"
                    break
            }

            console.log(`[WMT:${lvl}${this.includeTime ? " - " + new Date().toISOString() : ""}] ${message}`)
        }
    }
}