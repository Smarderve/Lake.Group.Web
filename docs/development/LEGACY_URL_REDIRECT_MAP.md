# Lake Group legacy URL redirect map

The IIS rules in `web.config` apply these permanent redirects after the HTTPS and `www` canonical redirect.

| Legacy route | Destination | Reason |
| --- | --- | --- |
| `/fuel.html` | `/lake-oil.html` | Petroleum business equivalent |
| `/lpg.html` | `/lake-gas.html` | LPG business equivalent |
| `/lubricants.html` | `/lake-lubes.html` | Lubricants business equivalent |
| `/steel.html` | `/lake-steel.html` | Steel business equivalent |
| `/concrete.html` | `/lake-premix-cement.html` | Concrete and aggregate business equivalent |
| `/logistics.html` | `/lake-trans.html` | Haulage and logistics business equivalent |
| `/container-services.html` | `/aficd.html` | Container-services business equivalent |
| `/services.html` | `/aficd.html` | Container-services business equivalent |
| `/la-home.html` | `/lake-agro.html` | Lake Agro replacement |
| `/la-projects.html` | `/lake-agro.html` | Lake Agro replacement |
| `/acfs.html` | `/index.html` | Retired container-services landing page |
| `/atl.html` | `/index.html` | Retired automotive landing page |
| `/ocean-galleria.html` | `/index.html` | Retired property landing page |

Unknown old routes must return IIS's normal 404 response. Do not redirect removed image URLs or unknown editorial routes to the homepage.
