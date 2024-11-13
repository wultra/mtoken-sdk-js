# Server Error Handling

When the request fails on the server, it can return an known error for you to interpret to the user and use it to log it
for better error reporting.

## Example error handling

```typescript
// Approve operation with a password
async function approve(operation: WMTOnlineOperation, password: string) {
    try {
        const auth = PowerAuthAuthentication.password(password)
        const response = await this.operations.authorize(operation, auth)
        if (response.status == "OK") {
            // operation authorized
        } else {
            if (response.responseError?.code == WMTKnownRestApiError.OperationAlreadyFinished) {
                // the operation was already approved)
            } else {
                // other handling
            }
        }
    } catch (e) {
        // failure (for example network not available or invalid powerauth state)
    }
}
```

## Known API Error codes

When the API call response has `responseError`, the `code` property can contain following errors:

| Error Code                   | Description                                                                     |
|------------------------------|---------------------------------------------------------------------------------|
| `ERROR_GENERIC`              | When unexpected error happened                                                  |
| `POWERAUTH_AUTH_FAIL`        | General authentication failure (wrong password, wrong activation state, etc...) |
| `INVALID_REQUEST`            | Invalid request sent - missing request object in the request                    |
| `INVALID_ACTIVATION`         | Activation is not valid (it is different from configured activation)            |
| `PUSH_REGISTRATION_FAILED`   | Error code for a situation when registration to push notification fails         |
| `OPERATION_ALREADY_FINISHED` | Operation is already finished                                                   |
| `OPERATION_ALREADY_FAILED`   | Operation is already failed                                                     |
| `OPERATION_ALREADY_CANCELED` | Operation is canceled                                                           |
| `OPERATION_EXPIRED`          | Operation is expired                                                            |
| `OPERATION_FAILED`           | Default operation action failure                                                |
| `ERR_AUTHENTICATION`         | Error in case that PowerAuth authentication fails                               |
| `ERR_SECURE_VAULT`           | Error during secure vault unlocking                                             |
| `ERR_ENCRYPTION`             | Returned in case encryption or decryption fails                                 |

## Read Next
  
- [Language and User-Agent Configuration](./Language-UserAgent-Configuration.md)