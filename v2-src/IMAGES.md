# Images for the v2 build

`public/images/` is not tracked. Its contents are byte-identical to the built
output in `../v2/images/`, and keeping both in the repo meant storing and
deploying the same 77MB twice.

Before running `npm run build`:

    mkdir -p public/images && cp ../v2/images/* public/images/

The build copies `public/` into `../v2/`, so the two stay in step.
