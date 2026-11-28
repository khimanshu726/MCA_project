import InfoPage from "./InfoPage";
import { FaqList } from "../../components/home/HomeFaqSection";

function FaqPage() {
  return (
    <InfoPage
      eyebrow="FAQ"
      title="Frequently asked questions"
      description="Answers about ordering print from Elite Impressions: customization, uploads, lead times, bulk orders, delivery and contact."
      path="/faq"
    >
      <FaqList />
    </InfoPage>
  );
}

export default FaqPage;
