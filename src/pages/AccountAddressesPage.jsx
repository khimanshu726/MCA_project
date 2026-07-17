import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import AddressForm from "../components/AddressForm";
import AddressList from "../components/AddressList";
import Button from "../components/ui/Button";
import { useUserAuth } from "../context/UserAuthContext";
import { useAddressManager } from "../hooks/useAddressManager";

/**
 * The saved address book, outside a checkout.
 *
 * Reuses useAddressManager rather than re-implementing CRUD — it already owns
 * the form state, validation, and the server calls, and checkout has been
 * exercising that path all along.
 *
 * What it deliberately drops is selection. In checkout, picking an address
 * means "deliver here"; here there is no order, so a radio would decide
 * nothing. The equivalent question outside a checkout is which address is the
 * default, so that's the action offered instead.
 *
 * The route is behind ProtectedRoute, so the hook's guest branch is
 * unreachable — but the address book is inherently an account feature, and a
 * signed-out visitor has nothing to show, which is the same reason wishlist
 * and orders are protected.
 */
function AccountAddressesPage() {
  const { user, isAuthenticated } = useUserAuth();
  const [message, setMessage] = useState("");
  const manager = useAddressManager({ user, isAuthenticated, onMessage: setMessage });

  const handleSetDefault = async (addressId) => {
    setMessage("");
    try {
      await manager.setDefaultAddress(addressId);
    } catch (error) {
      setMessage(error.payload?.message || error.message || "Unable to update the default address.");
    }
  };

  const handleDelete = async (addressId) => {
    if (!window.confirm("Delete this address? This cannot be undone.")) return;
    setMessage("");
    try {
      await manager.deleteAddress(addressId);
    } catch (error) {
      setMessage(error.payload?.message || error.message || "Unable to delete this address.");
    }
  };

  return (
    <main className="page-stack">
      <section className="section-panel">
        <Link to="/account" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-600 hover:text-brand-600">
          <ChevronLeft size={15} aria-hidden="true" />
          Back to account
        </Link>

        <div className="section-heading">
          <p className="eyebrow">Saved addresses</p>
          <h2>Manage the addresses you deliver to.</h2>
          <p className="section-copy">
            These appear at checkout, so you don’t retype them on every order. Your default is selected first.
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {manager.isLoading ? (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 text-sm text-ink-500">
              Loading your addresses…
            </div>
          ) : (
            <AddressList
              addresses={manager.savedAddresses}
              onEdit={manager.openEditForm}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              emptyMessage="No saved addresses yet. Add one and it’ll be ready at checkout."
            />
          )}

          {!manager.isFormVisible ? (
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={manager.openNewForm}>
              Add new address
            </Button>
          ) : null}

          {manager.isFormVisible ? (
            <AddressForm
              formState={manager.formState}
              errors={manager.errors}
              touched={manager.touched}
              editingAddressId={manager.editingAddressId}
              requireEmail={manager.requireEmail}
              showTypeAndDefault
              isSaving={manager.isSaving}
              onFieldChange={manager.changeField}
              onFieldBlur={manager.blurField}
              onSetFieldsSilently={manager.setFieldsSilently}
              onSubmit={manager.saveForm}
              onCancel={manager.resetForm}
            />
          ) : null}

          {message ? <p className="submit-message">{message}</p> : null}
        </div>
      </section>
    </main>
  );
}

export default AccountAddressesPage;
