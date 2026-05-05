import type Stripe from "stripe";

import { getOrganization } from "@/lib/data";
import { isDemoMode } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const mapStripeSubscriptionStatus = (status: Stripe.Subscription.Status) => {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    case "unpaid":
      return "UNPAID";
    case "paused":
      return "PAUSED";
    default:
      return "NONE";
  }
};

export const getBillingSnapshot = async () => {
  const organization = await getOrganization();

  return {
    isDemoMode,
    billing: {
      organizationId: organization.id,
      planName: organization.planName,
      stripeCustomerId: organization.stripeCustomerId,
      stripeSubscriptionId: organization.stripeSubscriptionId,
      subscriptionStatus: organization.subscriptionStatus,
      currentPeriodEnd: organization.currentPeriodEnd,
    },
  };
};

export const upsertOrganizationBillingFromSubscription = async (subscription: Stripe.Subscription) => {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const organizationId = subscription.metadata.organizationId;

  if (!organizationId) {
    throw new Error("Stripe subscription is missing organizationId metadata.");
  }

  const currentPeriodEnd = subscription.items.data[0]?.current_period_end
    ? new Date(subscription.items.data[0].current_period_end * 1000)
    : null;

  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: mapStripeSubscriptionStatus(subscription.status),
      currentPeriodEnd,
      planName: subscription.items.data[0]?.price.nickname ?? "Pro",
    },
  });
};

export const markCustomerSubscriptionCanceled = async (subscription: Stripe.Subscription) => {
  const organizationId = subscription.metadata.organizationId;
  if (!organizationId) {
    return null;
  }

  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionStatus: "CANCELED",
      currentPeriodEnd: null,
    },
  });
};
