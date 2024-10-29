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

import { PowerAuth } from 'react-native-powerauth-mobile-sdk';
import { TestSuite } from './TestSuite';
import { IntegrationUtils, type NewInboxMessage, } from './utils/IntegrationUtils';
import { MobileToken, type InboxMessage } from 'react-native-mtoken-sdk';

export class TestSuite_IntegrationInbox extends TestSuite {

    private pin = "1234"
    private powerAuth!: PowerAuth
    private mtoken!: MobileToken

    protected async beforeAll(): Promise<void> {
        console.log("")
        console.log("beforeAll: loading test credentials...")
        await IntegrationUtils.prepareCredentials()
        console.log("beforeAll: test credentials loaded!")
    }

    protected async beforeEach(testname: string): Promise<void> {
        console.log("")
        console.log("beforeEach: preparing activation...")
        const result = await IntegrationUtils.prepareActivation(this.pin)
        this.powerAuth = result.powerauth
        this.mtoken = result.mtoken
        console.log("beforeEach: activation prepared!")
    }

    protected async afterEach(testname: string, success: boolean): Promise<void> {
        if (this.powerAuth) {
            console.log("")
            console.log("afterEach: removing activation...")
            await IntegrationUtils.removeRegistration(await this.powerAuth.getActivationIdentifier())
            this.powerAuth.removeActivationLocal()
            console.log("afterEach: activation removed!")
        }
    }

    async testInboxMessages() {
        const messagesToTest = 5
        this.assertEquals(0, await this.fetchUnreadMessagesCount())

        // Now prepare messages
        const messages = await IntegrationUtils.createInboxMessages(messagesToTest)
        this.assertEquals(messagesToTest, await this.fetchUnreadMessagesCount())

        // Read first page
        const messagesList = (await this.mtoken.inbox.list(0, 50, false)).responseObject
        this.assertNotNull(messagesList)
        this.compareMessages(messages, messagesList!!)

        // Now read first message's detail
        const firstMessage = messages[0]
        const detail = (await this.mtoken.inbox.detail(firstMessage.id)).responseObject!!

        this.assertEquals(firstMessage.id, detail.id)
        this.assertEquals(firstMessage.subject, detail.subject)
        this.assertEquals(firstMessage.summary, detail.summary)
        this.assertEquals(firstMessage.body, detail.body)
        this.assertEquals(firstMessage.read, detail.read)
        this.assertEquals(firstMessage.type, detail.type)
        this.assertEquals(Math.floor(firstMessage.timestamp / 1000), Math.floor(detail.timestampCreated.getTime() / 1000))
    }

    async testMarkMessageRead() {
        const count = 4
        const messages = await IntegrationUtils.createInboxMessages(count)
        const receivedMessages = (await this.mtoken.inbox.list(0, 50, false)).responseObject!!

        this.compareMessages(messages, receivedMessages)

        // Mark first as read and receive its detail
        const messageId = receivedMessages[0].id
        const markRead = await this.mtoken.inbox.markRead(messageId)
        this.assertEquals(markRead.status, "OK")

        // Now get message detail
        const messageDetail = await this.mtoken.inbox.detail(messageId)
        this.assertNotNull(messageDetail.responseObject)
        this.assertTrue(messageDetail.responseObject!!.read)
    }

    private async fetchUnreadMessagesCount(): Promise<number> {
        let resp = await this.mtoken.inbox.unreadCount()
        return resp.responseObject!!.countUnread
    }

    private compareMessages(expected: NewInboxMessage[], received: InboxMessage[]) {
        this.assertEquals(expected.length, received.length)
        expected.forEach( detail => {
            const message = received.find( it => it.id == detail.id )
            if (!!!message) {
                throw new Error(`Message with ID ${detail.id} not found`)
            }

            this.assertEquals(detail.subject, message.subject)
            this.assertEquals(detail.read, message.read)
            this.assertEquals(detail.summary, message.summary)
            this.assertEquals(detail.type, message.type)
            this.assertEquals(Math.floor(detail.timestamp / 1000), Math.floor(message.timestampCreated.getTime() / 1000))
        })
    }
}
