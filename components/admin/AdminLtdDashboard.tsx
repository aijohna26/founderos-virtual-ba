"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Loader2 } from "lucide-react";

interface OfferRow {
  offerId: string;
  releaseNumber: number;
  priceCents: number;
  currency: string;
  quantityTotal: number;
  quantitySold: number;
  status: "active" | "sold_out" | "closed";
  createdAt: string;
}

interface PurchaseRow {
  stripePaymentIntentId: string;
  userId: string;
  offerId: string;
  foundingMemberNumber: number;
  amountPaidCents: number;
  currency: string;
  payerEmail: string | null;
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function AdminLtdDashboard() {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);

  const [newOffer, setNewOffer] = useState({ offerId: "", releaseNumber: "", price: "", quantity: "100" });
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    const [offersRes, purchasesRes] = await Promise.all([
      fetch("/api/admin/ltd/offers"),
      fetch("/api/admin/ltd/purchases"),
    ]);
    const offersData = await offersRes.json().catch(() => ({ offers: [] }));
    const purchasesData = await purchasesRes.json().catch(() => ({ purchases: [] }));
    setOffers(offersData.offers ?? []);
    setPurchases(purchasesData.purchases ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Data fetch on mount: setState here happens after the awaited fetch resolves, not
    // synchronously within this effect body -- same pattern already used elsewhere in this
    // app (e.g. AiAnalystPanel's venture-load effect).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setActionError(null);
    const priceCents = Math.round(Number(newOffer.price) * 100);
    const res = await fetch("/api/admin/ltd/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offerId: newOffer.offerId,
        releaseNumber: Number(newOffer.releaseNumber),
        priceCents,
        quantityTotal: Number(newOffer.quantity),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setActionError(data.error || "Failed to create offer");
      return;
    }
    setNewOffer({ offerId: "", releaseNumber: "", price: "", quantity: "100" });
    refresh();
  };

  const handleAction = async (offerId: string, action: "activate" | "close") => {
    const confirmText =
      action === "activate"
        ? `Activate ${offerId}? This closes whatever offer is currently active and makes this one live on /pricing.`
        : `Close ${offerId}? It stops appearing as purchasable on /pricing.`;
    if (!window.confirm(confirmText)) return;

    setBusyOfferId(offerId);
    setActionError(null);
    const res = await fetch(`/api/admin/ltd/offers/${encodeURIComponent(offerId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyOfferId(null);
    if (!res.ok) {
      setActionError(data.error || "Action failed");
      return;
    }
    refresh();
  };

  const totalRevenueCents = purchases.reduce((sum, p) => sum + p.amountPaidCents, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-black">LTD</h2>
        <p className="text-xs text-slate-400 font-medium">
          {purchases.length} founding members · {formatMoney(totalRevenueCents, "usd")} total revenue
        </p>
      </div>

      {actionError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300">
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800">
                <h2 className="text-sm font-bold">Releases</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-800">
                      <th className="px-5 py-2">Release</th>
                      <th className="px-5 py-2">Offer ID</th>
                      <th className="px-5 py-2">Price</th>
                      <th className="px-5 py-2">Sold / Total</th>
                      <th className="px-5 py-2">Status</th>
                      <th className="px-5 py-2">Created</th>
                      <th className="px-5 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((offer) => (
                      <tr key={offer.offerId} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-5 py-2.5 font-bold">#{offer.releaseNumber}</td>
                        <td className="px-5 py-2.5 font-mono text-xs text-slate-400">{offer.offerId}</td>
                        <td className="px-5 py-2.5">{formatMoney(offer.priceCents, offer.currency)}</td>
                        <td className="px-5 py-2.5">{offer.quantitySold} / {offer.quantityTotal}</td>
                        <td className="px-5 py-2.5">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              offer.status === "active"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : offer.status === "sold_out"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-slate-700/50 text-slate-400"
                            }`}
                          >
                            {offer.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-xs text-slate-500">
                          {new Date(offer.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          {busyOfferId === offer.offerId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
                          ) : offer.status === "active" ? (
                            <button
                              onClick={() => handleAction(offer.offerId, "close")}
                              className="text-xs font-bold text-rose-400 hover:text-rose-300"
                            >
                              Close
                            </button>
                          ) : offer.quantitySold < offer.quantityTotal ? (
                            <button
                              onClick={() => handleAction(offer.offerId, "activate")}
                              className="text-xs font-bold text-blue-400 hover:text-blue-300"
                            >
                              Activate
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {offers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-6 text-center text-sm text-slate-500">
                          No releases yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-sm font-bold mb-4">Create a new release</h2>
              <form onSubmit={handleCreateOffer} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Offer ID</label>
                  <input
                    value={newOffer.offerId}
                    onChange={(e) => setNewOffer({ ...newOffer, offerId: e.target.value })}
                    placeholder="ltd-release-2"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Release #</label>
                  <input
                    type="number"
                    min={1}
                    value={newOffer.releaseNumber}
                    onChange={(e) => setNewOffer({ ...newOffer, releaseNumber: e.target.value })}
                    placeholder="2"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Price (USD)</label>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={newOffer.price}
                    onChange={(e) => setNewOffer({ ...newOffer, price: e.target.value })}
                    placeholder="500"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={newOffer.quantity}
                    onChange={(e) => setNewOffer({ ...newOffer, quantity: e.target.value })}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 transition-colors"
                  >
                    {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Create release (inactive until you Activate it)
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800">
                <h2 className="text-sm font-bold">Founding members</h2>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-800 sticky top-0 bg-slate-900">
                      <th className="px-5 py-2">#</th>
                      <th className="px-5 py-2">Email</th>
                      <th className="px-5 py-2">Offer</th>
                      <th className="px-5 py-2">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => (
                      <tr key={p.stripePaymentIntentId} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-5 py-2.5 font-mono text-xs font-bold text-amber-400">
                          #{String(p.foundingMemberNumber).padStart(3, "0")}
                        </td>
                        <td className="px-5 py-2.5 text-xs">{p.payerEmail || p.userId}</td>
                        <td className="px-5 py-2.5 text-xs text-slate-400 font-mono">{p.offerId}</td>
                        <td className="px-5 py-2.5 text-xs">{formatMoney(p.amountPaidCents, p.currency)}</td>
                      </tr>
                    ))}
                    {purchases.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-6 text-center text-sm text-slate-500">
                          No purchases yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
    </div>
  );
}
