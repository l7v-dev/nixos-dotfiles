package api

import (
	"net/http"
	"strconv"

	"github.com/l7v/panel-agent/internal/packages"
)

// packagesSearchHandler handles GET /api/v1/packages/search?q=...&channel=...&limit=...
func packagesSearchHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Packages == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "packages engine not configured"})
			return
		}

		q := r.URL.Query().Get("q")
		channel := r.URL.Query().Get("channel")
		limitStr := r.URL.Query().Get("limit")

		limit := 30
		if limitStr != "" {
			if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
				limit = parsed
			}
		}

		resp, err := d.Packages.SearchPackages(r.Context(), packages.PackageSearchParams{
			Query:   q,
			Channel: channel,
			Limit:   limit,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

// packagesOptionsHandler handles GET /api/v1/packages/options?q=...&channel=...&scope=...&limit=...
func packagesOptionsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Packages == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "packages engine not configured"})
			return
		}

		q := r.URL.Query().Get("q")
		channel := r.URL.Query().Get("channel")
		scope := r.URL.Query().Get("scope")
		limitStr := r.URL.Query().Get("limit")

		limit := 30
		if limitStr != "" {
			if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
				limit = parsed
			}
		}

		resp, err := d.Packages.SearchOptions(r.Context(), packages.OptionSearchParams{
			Query:   q,
			Channel: channel,
			Scope:   scope,
			Limit:   limit,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

// packagesInstalledHandler handles GET /api/v1/packages/installed
func packagesInstalledHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Packages == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "packages engine not configured"})
			return
		}

		list, err := d.Packages.ListInstalledPackages(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"total":    len(list),
			"packages": list,
		})
	}
}

// packagesInfoHandler handles GET /api/v1/packages/info?name=...&channel=...
func packagesInfoHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Packages == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "packages engine not configured"})
			return
		}

		name := r.URL.Query().Get("name")
		channel := r.URL.Query().Get("channel")

		if name == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "parameter 'name' is required"})
			return
		}

		info, err := d.Packages.GetPackageInfo(r.Context(), name, channel)
		if err != nil {
			writeError(w, http.StatusNotFound, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, info)
	}
}
