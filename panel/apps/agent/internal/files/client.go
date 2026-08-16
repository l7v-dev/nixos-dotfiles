package files

type defaultFilesClient struct{}

// NewClient returns a new files.Client instance.
func NewClient() Client {
	return &defaultFilesClient{}
}
