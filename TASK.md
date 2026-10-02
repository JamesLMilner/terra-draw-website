Review the codebase for any existing geojson import functionality.

Give me a breakdown of the existing export functionality - i.e. ui components, maplibre plumbing, compatibility quirks

Plan an import feature that mirrors export in both look and code structure. Visually it should appear above the geojson output in the sidebar.

part of this excercise is to show me how the codebase author added export in order for me to better understand the structure of the codebase.

if there is no strong existing pattern for features, then this would be a good time to set a pattern by having import/export well aligned. I want changes to be minimal, but how geojson is injested needs to map well on to the underlying terra draw store ( see https://github.com/JamesLMilner/terra-draw/blob/main/guides/2.STORE.md )

Mapping elegently onto the native terra draw store is important - this is the demo app of the library.
