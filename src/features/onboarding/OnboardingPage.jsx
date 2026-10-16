import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Globe2, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Alert, Button, Checkbox, Input, Select, useToast } from "../../components/ui/index.js";
import { createClient } from "../clients/clientApi.js";
import { createWebsite } from "../websites/websiteApi.js";
import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";

const initialBusiness = { companyName: "", businessCategory: "", primaryCountry: "United States" };
const initialWebsite = { domain: "", cms: "WordPress", preferredLocale: "en-US", targetLocation: "United States", searchEngines: ["google"] };

function normalizeDomain(value) {
  const candidate = value.trim();
  if (!candidate) return "";
  try { return new URL(candidate.includes("://") ? candidate : `https://${candidate}`).hostname; } catch { return candidate; }
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { refreshClients } = useWorkspace();
  const [step, setStep] = useState(1);
  const [business, setBusiness] = useState(initialBusiness);
  const [website, setWebsite] = useState(initialWebsite);
  const [createdClient, setCreatedClient] = useState(null);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateBusiness() {
    const next = {};
    if (business.companyName.trim().length < 2) next.companyName = "Enter the client or business name.";
    if (business.businessCategory.trim().length < 2) next.businessCategory = "Describe the main service or industry.";
    if (!business.primaryCountry.trim()) next.primaryCountry = "Enter the primary market.";
    setErrors(next);
    return !Object.keys(next).length;
  }

  function validateWebsite() {
    const next = {};
    const domain = normalizeDomain(website.domain);
    if (!domain.includes(".") || domain.includes(" ")) next.domain = "Enter a valid domain such as example.com.";
    if (!website.targetLocation.trim()) next.targetLocation = "Enter at least one target location.";
    if (!website.searchEngines.length) next.searchEngines = "Choose at least one search engine.";
    setErrors(next);
    return !Object.keys(next).length;
  }

  function continueToWebsite() {
    if (!validateBusiness()) return;
    setError("");
    setWebsite((current) => ({ ...current, targetLocation: business.primaryCountry }));
    setStep(2);
  }

  function toggleSearchEngine(engine) {
    setWebsite((current) => ({ ...current, searchEngines: current.searchEngines.includes(engine) ? current.searchEngines.filter((item) => item !== engine) : [...current.searchEngines, engine] }));
  }

  async function finishSetup(event) {
    event.preventDefault();
    if (!validateWebsite()) return;
    setError(""); setIsSubmitting(true);
    try {
      let client = createdClient;
      if (!client) {
        const response = await createClient({ companyName: business.companyName.trim(), status: "active", retainerAmount: null, retainerCycle: "monthly" });
        client = response.client;
        setCreatedClient(client);
      }
      await createWebsite(client.id, {
        domain: normalizeDomain(website.domain), status: "active", cms: website.cms, businessCategory: business.businessCategory,
        targetLocations: website.targetLocation.split(",").map((item) => item.trim()).filter(Boolean), targetSearchEngines: website.searchEngines,
        preferredLocale: website.preferredLocale, primaryCountry: business.primaryCountry, isMock: false,
      });
      await refreshClients();
      setStep(3);
      notify("Your first website workspace is ready", "success");
    } catch (requestError) { setError(requestError.message); } finally { setIsSubmitting(false); }
  }

  return (
    <main className="onboarding-page"><section className="onboarding-shell">
      <header className="onboarding-header"><div className="onboarding-brand"><span>S</span><strong>SLDM</strong></div><div className="onboarding-progress" aria-label={`Setup step ${step} of 3`}>{[1, 2, 3].map((item) => <span className={item <= step ? "active" : ""} key={item}><i>{item < step ? <Check size={13} /> : item}</i><small>{item === 1 ? "Business" : item === 2 ? "Website" : "Ready"}</small></span>)}</div></header>
      <div className="onboarding-content">
        {step === 1 ? <><div className="onboarding-intro"><span><Building2 size={22} /></span><p>Step 1 of 3</p><h1>Tell us about your first client</h1><p>This creates the workspace where website research, tasks, and reports will live.</p></div><div className="onboarding-form"><Input autoFocus error={errors.companyName} label="Client or business name" onChange={(event) => setBusiness({ ...business, companyName: event.target.value })} placeholder="Acme Services" required value={business.companyName} /><Input error={errors.businessCategory} hint="Used to organize research and recommendations" label="Main service or industry" onChange={(event) => setBusiness({ ...business, businessCategory: event.target.value })} placeholder="Home renovation" required value={business.businessCategory} /><Input error={errors.primaryCountry} label="Primary market" onChange={(event) => setBusiness({ ...business, primaryCountry: event.target.value })} placeholder="United States" required value={business.primaryCountry} />{error ? <Alert tone="error" title="Client setup failed">{error}</Alert> : null}<Button icon={ArrowRight} onClick={continueToWebsite} size="lg">Continue to website</Button></div></> : null}
        {step === 2 ? <><div className="onboarding-intro"><span><Globe2 size={22} /></span><p>Step 2 of 3</p><h1>Set up the website</h1><p>Use business-friendly settings now. You can add more locations and competitors later.</p></div><form className="onboarding-form" onSubmit={finishSetup}><Input autoFocus error={errors.domain} label="Website domain" onChange={(event) => setWebsite({ ...website, domain: event.target.value })} placeholder="example.com" required value={website.domain} /><div className="onboarding-form-grid"><Select label="Website platform" onChange={(event) => setWebsite({ ...website, cms: event.target.value })} value={website.cms}><option>WordPress</option><option>Shopify</option><option>Webflow</option><option>Wix</option><option>Squarespace</option><option value="Custom">Custom or other</option></Select><Select label="Content language" onChange={(event) => setWebsite({ ...website, preferredLocale: event.target.value })} value={website.preferredLocale}><option value="en-US">English (United States)</option><option value="en-GB">English (United Kingdom)</option><option value="en-IN">English (India)</option><option value="hi-IN">Hindi (India)</option></Select></div><Input error={errors.targetLocation} hint="Separate multiple locations with commas" label="Target locations" onChange={(event) => setWebsite({ ...website, targetLocation: event.target.value })} value={website.targetLocation} /><fieldset className="onboarding-options"><legend>Search engines</legend><Checkbox checked={website.searchEngines.includes("google")} label="Google" onChange={() => toggleSearchEngine("google")} /><Checkbox checked={website.searchEngines.includes("bing")} label="Bing" onChange={() => toggleSearchEngine("bing")} />{errors.searchEngines ? <small role="alert">{errors.searchEngines}</small> : null}</fieldset>{error ? <Alert tone="error" title="Website setup failed">{error}</Alert> : null}<div className="onboarding-actions"><Button icon={ArrowLeft} onClick={() => setStep(1)} variant="secondary">Back</Button><Button disabled={isSubmitting} icon={Rocket} size="lg" type="submit">{isSubmitting ? "Building workspace..." : "Finish setup"}</Button></div></form></> : null}
        {step === 3 ? <div className="onboarding-complete"><span><Check size={30} /></span><p>Setup complete</p><h1>Your SEO workspace is ready</h1><p><strong>{business.companyName}</strong> and <strong>{normalizeDomain(website.domain)}</strong> are connected. Start with the performance workspace or run the first technical audit.</p><div><Button onClick={() => navigate("/seo-dashboard", { replace: true })} size="lg">Open SEO dashboard</Button><Button onClick={() => navigate("/audits", { replace: true })} size="lg" variant="secondary">Run first audit</Button></div></div> : null}
      </div>
    </section></main>
  );
}
