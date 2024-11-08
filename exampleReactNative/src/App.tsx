import { useEffect, useState } from 'react'
import { StyleSheet, View, Alert, Button, Text } from 'react-native'
import { TestExecutor } from './tests/TestExecutor'
import { WMTLogger, WMTLoggerVerbosity } from 'react-native-mtoken-sdk'

export default function App() {

  useEffect(() => {
    prepare().catch(handleError);
  }, [])

  const handleError = (err: any) => {
    console.log(err)
    Alert.alert("Error", `${JSON.stringify(err)}`)
  }

  const [isRunning, setIsRunning] = useState(false)

  const [testExecutor] = useState(new TestExecutor())

  const prepare = async (): Promise<void> => {
    await runTests()
  }

  const runTests = async () => {
    WMTLogger.verbosity = WMTLoggerVerbosity.NONE
    testExecutor.stopAllTests()
    setIsRunning(true)
    const result = await testExecutor.runAllTests()
    Alert.alert(`Test result: ${result.succeededTests}/ ${result.totalTests} succeeded`)
    setIsRunning(false)
  }

  return (
    <View style={styles.container}>
      {isRunning ? <Text>Running tests...</Text> : <Button title="Run tests" onPress={async () => {
        await runTests()
      }} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
})
