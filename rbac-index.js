const rbac = require('./rbac');

(
    async () => {
        try {
            await rbac.createApp()
        } catch (ex) {
            console.error(ex)
        }       
    }
)()
