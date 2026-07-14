import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";

function EmptyCartState() {
  return (
    <EmptyState
      icon={ShoppingBag}
      title="Your cart is empty"
      description="Browse the catalog to find business cards, packaging, merchandise, and more."
      action={
        <Button as={Link} to="/products">
          Browse products
        </Button>
      }
    />
  );
}

export default EmptyCartState;
