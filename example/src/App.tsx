import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { StyleSheet, View, Text, Alert, Button } from 'react-native';
import { MobileToken, type UserOperation, QROperationParser } from 'react-native-mtoken-sdk';
import { PowerAuth, PowerAuthActivation, PowerAuthAuthentication, type PowerAuthActivationStatus } from 'react-native-powerauth-mobile-sdk';
import { TestExecutor } from './tests/TestExecutor';

export default function App() {

  const powerAuth = new PowerAuth("test-instance");
  const mtoken = new MobileToken(powerAuth);
  const pin = "1111";

  const [isActivated, setIsActivated] = useState<boolean | undefined>();
  const [status, setStatus] = useState<PowerAuthActivationStatus | undefined>();

  useEffect(() => {
    prepare().catch(log);
  }, []);

  const log = (err: any) => {
    console.log(err);
    Alert.alert("Error", `${JSON.stringify(err)}`);
  }

  const prepare = async (): Promise<void> => {
    if (!await powerAuth.isConfigured()) {
      await powerAuth.configure(
        "appKey",
        "appSecret",
        "masterPublicKey",
        "https://yoururl.com/enrollment-server/",
        false
      )
    }

    let isActivated = await powerAuth.hasValidActivation();
    setIsActivated(isActivated);
    if (isActivated) {
      await updateStatus()
    }

    mtoken.setAcceptLanguage("cs");

    await testExecutor.runAllTests();
  }

  const updateStatus = async () => {
    setStatus(undefined);
    setStatus(await powerAuth.fetchActivationStatus());
  }

  return (
    <View style={styles.container}>
      <Text>Is Activated: {isActivated ? "yes" : "no"}</Text>
      <Text>Activation status: {JSON.stringify(status)}</Text>
      <Button title='Activate and commit' onPress={async () => {
        try {
          await powerAuth.createActivation(PowerAuthActivation.createWithActivationCode("XGDD6-RC2NU-XVU4D-43N3Q", "React-Native-MtokenSDK-example"));
          await powerAuth.commitActivation(PowerAuthAuthentication.commitWithPassword(pin));
          Alert.alert("OK");
        } catch (err) {
          log(err);
        }
      }} />
      <Button title='Update status' onPress={async () => {
        try {
          await updateStatus();
        } catch (err) {
          log(err);
        }
      }} />
      <Button title='Fetch operations' onPress={async () => {
        try {
          let result = await mtoken.operations.pendingList();
          let json = JSON.stringify(result);
          console.log(json);
          if (result.responseObject) {
            Alert.alert(json);
          } else if (result.responseError) {
            Alert.alert(`${result.responseError.code}`, `${result.responseError.message}`);
          }
        } catch (err) {
          log(err);
        }
      }} />
      <Button title='Fetch operation detail' onPress={async () => {
        try {
          let result = await mtoken.operations.pendingList();
          console.log(JSON.stringify(result));
          if (result.responseObject) {
            if (result.responseObject[0]) {
              let detail = await mtoken.operations.detail(result.responseObject[0].id);
              Alert.alert("OperatioDetailMessage", `${detail.responseObject?.operationCreated.toLocaleString()}\n${detail.responseObject?.formData.title}\n${detail.responseObject?.status}`)
            } else {
              Alert.alert("No operation in the list")
            }
          } else if (result.responseError) {
            Alert.alert(`${result.responseError.code}`, `${result.responseError.message}`);
          }

        } catch (err) {
          log(err);
        }
      }} />
      <Button title='Auhtorize first operation' onPress={async () => {
        try {
          let list = await mtoken.operations.pendingList();
          console.log(JSON.stringify(list));
          if (list.responseObject) {
            if (list.responseObject[0]) {
              let response = await mtoken.operations.authorize(list.responseObject[0], PowerAuthAuthentication.password(pin));
              Alert.alert("Authorize Result", `${response.status}`)
            } else {
              Alert.alert("No operation in the list")
            }
          } else if (list.responseError) {
            Alert.alert(`${list.responseError.code}`, `${list.responseError.message}`);
          }

        } catch (err) {
          log(err);
        }
      }} />
      <Button title='Reject first operation' onPress={async () => {
        try {
          let list = await mtoken.operations.pendingList();
          console.log(JSON.stringify(list));
          if (list.responseObject) {
            if (list.responseObject[0]) {
              let response= await mtoken.operations.reject(list.responseObject[0].id, "HELLO_FROM_REACT");
              Alert.alert("Reject Result", `${response.status}`)
            } else {
              Alert.alert("No operation in the list")
            }
          } else if (list.responseError) {
            Alert.alert(`${list.responseError.code}`, `${list.responseError.message}`);
          }

        } catch (err) {
          log(err);
        }
      }} />
      <Button title='Register for push' onPress={async () => {
        try {
          
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;

          if (existingStatus !== 'granted') {
              const { status } = await Notifications.requestPermissionsAsync();
              finalStatus = status;
          }
          if (finalStatus !== 'granted') {
              alert('Failed to get push token for push notification!');
              return;
          }
          let token = (await Notifications.getDevicePushTokenAsync()).data;
          console.log(`token: ${token}`);

          let apiResult = await mtoken.push.register(token);

          alert(JSON.stringify(apiResult));

        } catch (err) {
          log(err);
        }
      }} />
      <Button title='Authorize QR operation' onPress={async () => {
        try {

          //const code = makeCode()

          Alert.prompt("QR Operation", "Insert QR code data", async code => {
            if (!code) {
              return;
            }

            try {
  
              const parsed = QROperationParser.parse(code.replaceAll("\\n", "\n"))
            
              console.log(parsed)
  
              const result = await mtoken.operations.authorizeOffline(parsed, PowerAuthAuthentication.password(pin));
              Alert.alert(`code: ${result}`)
            } catch (err) {
              log(err);
            }
          })

        } catch (err) {
          log(err);
        }
      }} />
      <Button title='Fetch inbox' onPress={async () => {
        try {
          let result = await mtoken.inbox.list(0, 10, false);
          let json = JSON.stringify(result);
          console.log(json);
          if (result.responseObject) {
            Alert.alert(json);
          } else if (result.responseError) {
            Alert.alert(`${result.responseError.code}`, `${result.responseError.message}`);
          }
        } catch (err) {
          log(err);
        }
      }} />
      <Button title='Inbox unread count' onPress={async () => {
        try {
          let result = await mtoken.inbox.unreadCount();
          let json = JSON.stringify(result);
          console.log(json);
          if (result.responseObject) {
            Alert.alert(json);
          } else if (result.responseError) {
            Alert.alert(`${result.responseError.code}`, `${result.responseError.message}`);
          }
        } catch (err) {
          log(err);
        }
      }} />
      <Button title='Fetch first message' onPress={async () => {
        try {
          let list = await mtoken.inbox.list(0, 10, false);
          let result = await mtoken.inbox.detail(list.responseObject!![0].id);
          let json = JSON.stringify(result);
          console.log(json);
          if (result.responseObject) {
            Alert.alert(json);
          } else if (result.responseError) {
            Alert.alert(`${result.responseError.code}`, `${result.responseError.message}`);
          }
        } catch (err) {
          log(err);
        }
      }} />
      <Button title='Make first message read' onPress={async () => {
        try {
          let list = await mtoken.inbox.list(0, 10, false);
          let result = await mtoken.inbox.markRead(list.responseObject!![0].id);
          let json = JSON.stringify(result);
          Alert.alert(json);
        } catch (err) {
          log(err);
        }
      }} />
      <Button title='Make all messages read' onPress={async () => {
        try {
          let result = await mtoken.inbox.markAllRead()
          let json = JSON.stringify(result);
          Alert.alert(json);
        } catch (err) {
          log(err);
        }
      }} />
      <Button title="Run tests" onPress={async () => {
        await testExecutor.runAllTests();
      }} />
    </View>
  );
}

function makeCode(
  operationId: string     = "5ff1b1ed-a3cc-45a3-8ab0-ed60950312b6",
  title: string           = "Payment",
  message: string         = "Please confirm this payment",
  operationData: string   = "A1*A100CZK*ICZ2730300000001165254011*D20180425*Thello world",
  flags: string           = "BCFX",
  otherAttrs: string[] | undefined   = undefined,
  nonce: string           = "AD8bOO0Df73kNaIGb3Vmpg==",
  signingKey: string      = "0",
  signature: string       = "MEYCIQDby1Uq+MaxiAAGzKmE/McHzNOUrvAP2qqGBvSgcdtyjgIhAMo1sgqNa1pPZTFBhhKvCKFLGDuHuTTYexdmHFjUUIJW"
  ): string {
    let attrs = otherAttrs == null ? "" : otherAttrs.join("\n") + "\n"
    return `${operationId}\n${title}\n${message}\n${operationData}\n${flags}\n${attrs}${nonce}\n${signingKey}${signature}`
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
