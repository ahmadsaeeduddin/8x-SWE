import { productDesignReviewMeeting } from "@/lib/mock-meeting-detail";
import { PRODUCT_DESIGN_REVIEW_SHARE_TOKEN } from "@/lib/share-token";

export const publicMeetingShares = [
  {
    token: PRODUCT_DESIGN_REVIEW_SHARE_TOKEN,
    meeting: productDesignReviewMeeting,
  },
];

export function getPublicMeetingShare(token: string) {
  return publicMeetingShares.find((share) => share.token === token);
}
