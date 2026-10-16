//
// Copyright 2026 Wultra s.r.o.
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
// See the License for the specific language governing permissions and
// limitations under the License.
//

import config from './utils/test-config.json'

export class TestReporter {
    private sequence = 0

    async send(type: string, data: object): Promise<void> {
        if (!config.collectorUrl) return
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 15000)
        try {
            const response = await fetch(`${config.collectorUrl}/events`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ runId: config.runId, sequence: this.sequence++, type, ...data }),
                signal: controller.signal
            })
            if (!response.ok) throw new Error('Test collector rejected event')
        } finally {
            clearTimeout(timer)
        }
    }
}
