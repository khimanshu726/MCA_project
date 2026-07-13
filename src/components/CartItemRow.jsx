import ResponsiveImage from "./ResponsiveImage";

function CartItemRow({ item, onQuantityChange, onRemove, priceLabel = `$${item.price * item.quantity}` }) {
  return (
    <article className="cart-item-row">
      <div className="cart-item-image">
        <ResponsiveImage
          src={item.images[0]}
          alt={item.name}
          className="card-image"
          aspectClassName="ratio-square"
        />
      </div>

      <div className="cart-item-copy">
        <p className="eyebrow">{item.category}</p>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
      </div>

      <div className="cart-item-controls">
        <div className="quantity-stepper" aria-label={`Quantity for ${item.name}`}>
          <button type="button" onClick={() => onQuantityChange(item.id, "decrement")} aria-label={`Decrease quantity of ${item.name}`}>
            -
          </button>
          <span>{item.quantity}</span>
          <button type="button" onClick={() => onQuantityChange(item.id, "increment")} aria-label={`Increase quantity of ${item.name}`}>
            +
          </button>
        </div>
        <strong>{priceLabel}</strong>
        <button type="button" className="text-button" onClick={() => onRemove(item.id)}>
          Remove
        </button>
      </div>
    </article>
  );
}

export default CartItemRow;
