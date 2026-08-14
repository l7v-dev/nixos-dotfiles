package apps

import (
	"sync"
)

var (
	registryMu sync.RWMutex
	catalog    = make(map[string]Application)
)

// Register adds an enterprise background service descriptor to the global catalog.
// Each service file calls Register in its init() function.
func Register(app Application) {
	registryMu.Lock()
	defer registryMu.Unlock()
	catalog[app.ID] = app
}

// GetRegisteredCatalog returns a copy of all registered background services.
func GetRegisteredCatalog() []Application {
	registryMu.RLock()
	defer registryMu.RUnlock()

	apps := make([]Application, 0, len(catalog))
	for _, app := range catalog {
		apps = append(apps, app)
	}
	return apps
}

// GetRegisteredApp returns a specific registered application descriptor by ID.
func GetRegisteredApp(id string) (Application, bool) {
	registryMu.RLock()
	defer registryMu.RUnlock()

	app, ok := catalog[id]
	return app, ok
}

// ResetCatalog clears and reinitializes the catalog (primarily for unit tests).
func ResetCatalog() {
	registryMu.Lock()
	defer registryMu.Unlock()
	catalog = make(map[string]Application)
}
