import { createSelector } from "@reduxjs/toolkit";
import { createCachedSelector } from "re-reselect";
import _ from "underscore";

import { LOAD_COMPLETE_FAVICON } from "metabase/common/hooks/use-favicon";
import {
  DASHBOARD_SLOW_TIMEOUT,
  SIDEBAR_NAME,
} from "metabase/dashboard/constants";
import { isEmbeddingSdk } from "metabase/embedding-sdk/config";
import { isNotNull } from "metabase/lib/types";
import * as Urls from "metabase/lib/urls";
import {
  getDashboardQuestions,
  getSavedDashboardUiParameters,
  getUnsavedDashboardUiParameters,
} from "metabase/parameters/utils/dashboards";
import { getParameterMappingOptions as _getParameterMappingOptions } from "metabase/parameters/utils/mapping-options";
import { getVisibleParameters } from "metabase/parameters/utils/ui";
import type { EmbeddingParameterVisibility } from "metabase/public/lib/types";
import {
  getEmbedOptions,
  getIsEmbeddingIframe,
} from "metabase/selectors/embed";
import { getMetadata } from "metabase/selectors/metadata";
import { getSetting } from "metabase/selectors/settings";
import { getIsWebApp } from "metabase/selectors/web-app";
import { extendCardWithDashcardSettings } from "metabase/visualizations/lib/settings/typed-utils";
import Question from "metabase-lib/v1/Question";
import {
  getValuePopulatedParameters as _getValuePopulatedParameters,
  getParameterValuesBySlug,
} from "metabase-lib/v1/parameters/utils/parameter-values";
import type {
  Card,
  DashCardId,
  Dashboard,
  DashboardCard,
  DashboardId,
  DashboardParameterMapping,
  ParameterId,
  VirtualCard,
} from "metabase-types/api";
import type {
  ClickBehaviorSidebarState,
  EditParameterSidebarState,
  State,
  StoreDashboard,
} from "metabase-types/store";

import { getNewCardUrl } from "./actions/getNewCardUrl";
import {
  canResetFilter,
  findDashCardForInlineParameter,
  getMappedParametersIds,
  hasDatabaseActionsEnabled,
  hasInlineParameters,
  isDashcardInlineParameter,
  isQuestionCard,
  isQuestionDashCard,
} from "./utils";

type SidebarState = State["dashboard"]["sidebar"];

function isClickBehaviorSidebar(
  sidebar: SidebarState,
): sidebar is ClickBehaviorSidebarState {
  return sidebar.name === SIDEBAR_NAME.clickBehavior;
}

function isEditParameterSidebar(
  sidebar: SidebarState,
): sidebar is EditParameterSidebarState {
  return sidebar.name === SIDEBAR_NAME.editParameter;
}

export const getDashboardBeforeEditing = (state: State) =>
  state.dashboard.editingDashboard;

export const getIsEditing = (state: State) =>
  Boolean(getDashboardBeforeEditing(state));

export const getClickBehaviorSidebarDashcard = (state: State) => {
  const { sidebar, dashcards } = state.dashboard;
  return isClickBehaviorSidebar(sidebar)
    ? dashcards[sidebar.props?.dashcardId]
    : null;
};
export const getDashboards = (state: State) => state.dashboard.dashboards;
export const getDashcardDataMap = (state: State) =>
  state.dashboard.dashcardData;

export const getDashcardData = createSelector(
  [getDashcardDataMap, (_state: State, dashcardId: DashCardId) => dashcardId],
  (dashcardDataMap, dashcardId) => {
    return dashcardDataMap[dashcardId];
  },
);

export const getSlowCards = (state: State) => state.dashboard.slowCards;
export const getParameterValues = (state: State) =>
  state.dashboard.parameterValues;
export const getFavicon = (state: State) =>
  state.dashboard.loadingControls?.showLoadCompleteFavicon
    ? LOAD_COMPLETE_FAVICON
    : null;

export const getIsDashCardsRunning = (state: State) =>
  state.dashboard.loadingDashCards.loadingStatus === "running";
export const getIsDashCardsLoadingComplete = (state: State) =>
  state.dashboard.loadingDashCards.loadingStatus === "complete";

export const getLoadingStartTime = (state: State) =>
  state.dashboard.loadingDashCards.startTime;
export const getLoadingEndTime = (state: State) =>
  state.dashboard.loadingDashCards.endTime;

export const getIsSlowDashboard = createSelector(
  [getLoadingStartTime, getLoadingEndTime],
  (startTime, endTime) => {
    if (startTime != null && endTime != null) {
      return endTime - startTime > DASHBOARD_SLOW_TIMEOUT;
    } else {
      return false;
    }
  },
);

export const getIsLoadingWithoutCards = (state: State) =>
  state.dashboard.loadingControls.isLoading;

export const getIsLoading = (state: State) =>
  getIsLoadingWithoutCards(state) || !getIsDashCardsLoadingComplete(state);

export const getIsAddParameterPopoverOpen = (state: State) =>
  state.dashboard.isAddParameterPopoverOpen;

export const getSidebar = (state: State) => state.dashboard.sidebar;
export const getIsSidebarOpen = createSelector(
  [getSidebar],
  (sidebar) => !!sidebar.name,
);
export const getIsSharing = createSelector(
  [getSidebar],
  (sidebar) => sidebar.name === SIDEBAR_NAME.sharing,
);

export const getShowAddQuestionSidebar = createSelector(
  [getSidebar],
  (sidebar) => sidebar.name === SIDEBAR_NAME.addQuestion,
);

export const getIsShowDashboardInfoSidebar = createSelector(
  [getSidebar],
  (sidebar) => sidebar.name === SIDEBAR_NAME.info,
);

export const getIsShowDashboardSettingsSidebar = createSelector(
  [getSidebar],
  (sidebar) => sidebar.name === SIDEBAR_NAME.settings,
);

export const getDashboardId = (state: State) => state.dashboard.dashboardId;

export const getDashboard = createSelector(
  [getDashboardId, getDashboards],
  (dashboardId, dashboards) =>
    dashboardId !== null ? dashboards[dashboardId] : undefined,
);

export const getDashcards = (state: State) => state.dashboard.dashcards;

export const getDashcardList = createSelector([getDashcards], (dashcards) =>
  Object.values(dashcards),
);

export const getDashCardById = (state: State, dashcardId: DashCardId) => {
  const dashcards = getDashcards(state);
  return dashcards[dashcardId];
};

export function getDashCardBeforeEditing(state: State, dashcardId: DashCardId) {
  const dashboard = getDashboardBeforeEditing(state);
  return dashboard?.dashcards?.find?.((dashcard) => dashcard.id === dashcardId);
}

export const getLoadingDashCards = (state: State) =>
  state.dashboard.loadingDashCards;

export const getDashboardById = (state: State, dashboardId: DashboardId) => {
  const dashboards = getDashboards(state);
  return dashboards[dashboardId];
};

export const getDashboardComplete = createSelector(
  [getDashboard, getDashcards],
  (dashboard, dashcards) => {
    if (!dashboard) {
      return null;
    }

    const orderedDashcards = dashboard.dashcards
      .map((id) => dashcards[id])
      .filter((dc) => !dc.isRemoved)
      .sort((a, b) => {
        const rowDiff = a.row - b.row;

        // sort by y position first
        if (rowDiff !== 0) {
          return rowDiff;
        }

        // for items on the same row, sort by x position
        return a.col - b.col;
      });

    return (
      dashboard && {
        ...dashboard,
        dashcards: orderedDashcards,
      }
    );
  },
);

export const getDashcardHref = createSelector(
  [getMetadata, getDashboardComplete, getParameterValues, getDashCardById],
  (metadata, dashboard, parameterValues, dashcard) => {
    if (
      !dashboard ||
      !dashcard ||
      !isQuestionDashCard(dashcard) ||
      !dashcard.card.dataset_query // cards without queries will cause MLv2 to throw in getNewCardUrl
    ) {
      return undefined;
    }

    const card = extendCardWithDashcardSettings(
      dashcard.card,
      dashcard.visualization_settings,
    );

    return getNewCardUrl({
      metadata,
      dashboard,
      parameterValues,
      dashcard,
      nextCard: card,
      previousCard: card,
    });
  },
);

export const getAutoApplyFiltersToastId = (state: State) =>
  state.dashboard.autoApplyFilters.toastId;
export const getAutoApplyFiltersToastDashboardId = (state: State) =>
  state.dashboard.autoApplyFilters.toastDashboardId;
export const getDraftParameterValues = (state: State) =>
  state.dashboard.draftParameterValues;

export const getIsAutoApplyFilters = createSelector(
  [getDashboard],
  (dashboard) => !!dashboard?.auto_apply_filters,
);
export const getHasUnappliedParameterValues = createSelector(
  [getParameterValues, getDraftParameterValues],
  (parameterValues, draftParameterValues) => {
    return !_.isEqual(draftParameterValues, parameterValues);
  },
);

export const getEffectiveParameterValues = createSelector(
  [getParameterValues, getDraftParameterValues, getIsAutoApplyFilters],
  (values, draftValues, isAutoApplyFilters) =>
    isAutoApplyFilters ? values : draftValues,
);

const getIsParameterValuesEmpty = createSelector(
  [getParameterValues],
  (parameterValues) => {
    return Object.values(parameterValues).every((parameterValue) =>
      Array.isArray(parameterValue)
        ? parameterValue.length === 0
        : parameterValue == null,
    );
  },
);

export const getParameterValuesBySlugMap = createSelector(
  [getDashboardComplete, getParameterValues],
  (dashboard, parameterValues) => {
    if (!dashboard) {
      return {};
    }
    return getParameterValuesBySlug(dashboard.parameters, parameterValues);
  },
);

export const getCanShowAutoApplyFiltersToast = createSelector(
  [
    getDashboard,
    getAutoApplyFiltersToastDashboardId,
    getIsAutoApplyFilters,
    getIsSlowDashboard,
    getIsParameterValuesEmpty,
  ],
  (
    dashboard,
    toastDashboardId,
    isAutoApply,
    isSlowDashboard,
    isParameterValuesEmpty,
  ) => {
    return (
      dashboard?.can_write &&
      dashboard?.id !== toastDashboardId &&
      isAutoApply &&
      isSlowDashboard &&
      !isParameterValuesEmpty
    );
  },
);

export const getDocumentTitle = (state: State) =>
  state.dashboard.loadingControls.documentTitle;

export const getIsNavigatingBackToDashboard = (state: State) =>
  state.dashboard.isNavigatingBackToDashboard;

export const getIsDirty = createSelector(
  [getDashboard, getDashcards],
  (dashboard, dashcards) => {
    if (!dashboard) {
      return false;
    }

    if (dashboard.isDirty) {
      return true;
    }

    return dashboard.dashcards.some((id) => {
      const dc = dashcards[id];
      return (
        !(dc.isAdded && dc.isRemoved) &&
        (dc.isDirty || dc.isAdded || dc.isRemoved)
      );
    });
  },
);

export const getEditingDashcardId = createSelector([getSidebar], (sidebar) => {
  return sidebar?.props?.dashcardId;
});

export const getEditingParameterId = createSelector([getSidebar], (sidebar) => {
  return isEditParameterSidebar(sidebar) ? sidebar.props?.parameterId : null;
});

export const getIsEditingParameter = createSelector(
  [getEditingParameterId],
  (parameterId) => parameterId != null,
);

export const getEditingParameter = createSelector(
  [getDashboard, getEditingParameterId],
  (dashboard, editingParameterId) => {
    const parameters = dashboard?.parameters || [];
    return editingParameterId != null
      ? _.findWhere(parameters, { id: editingParameterId })
      : null;
  },
);

/**
 * Returns the dashcard id of the dashcard that contains the parameter.
 * If the parameter is dashboard header parameter, it returns undefined.
 */
export const getEditingParameterInlineDashcard = createSelector(
  [getEditingParameterId, getDashcards],
  (editingParameterId, dashcards) => {
    return editingParameterId
      ? findDashCardForInlineParameter(
          editingParameterId,
          Object.values(dashcards),
        )
      : undefined;
  },
);

const getCard = (state: State, { card }: { card: Card | VirtualCard }) => card;
const getDashCard = (state: State, { dashcard }: { dashcard: DashboardCard }) =>
  dashcard;

export const getParameterTarget = createSelector(
  [getEditingParameter, getCard, getDashCard],
  (parameter, card, dashcard) => {
    if (parameter == null) {
      return null;
    }

    const parameterMappings = dashcard.parameter_mappings || [];

    const lookupProperties = card?.id
      ? { parameter_id: parameter.id, card_id: card.id }
      : { parameter_id: parameter.id };

    const mapping = _.findWhere(parameterMappings, lookupProperties);
    return mapping?.target;
  },
);

export const getQuestions = createSelector(
  [getDashboardComplete, getMetadata],
  (dashboard, metadata) => {
    if (!dashboard) {
      return {};
    }
    return getDashboardQuestions(dashboard.dashcards, metadata);
  },
);

export const getParameters = createSelector(
  [getDashboardComplete, getMetadata, getQuestions, getIsEditing],
  (dashboard, metadata, questions, isEditing) => {
    if (!dashboard || !metadata) {
      return [];
    }

    return isEditing
      ? getUnsavedDashboardUiParameters(
          dashboard.dashcards,
          dashboard.parameters,
          metadata,
          questions,
        )
      : getSavedDashboardUiParameters(
          dashboard.dashcards,
          dashboard.parameters,
          dashboard.param_fields,
          metadata,
        );
  },
);

export const getDashboardHeaderParameters = createSelector(
  [getDashcards, getParameters],
  (dashcards, parameters) => {
    const dashcardList = Object.values(dashcards);
    return parameters.filter(
      (parameter) => !isDashcardInlineParameter(parameter.id, dashcardList),
    );
  },
);

export const getDashboardHeaderValuePopulatedParameters = createSelector(
  [getDashboardHeaderParameters, getEffectiveParameterValues],
  (parameters, values) => _getValuePopulatedParameters({ parameters, values }),
);

export const getDashCardInlineValuePopulatedParameters = createSelector(
  [
    getDashcards,
    getParameters,
    getEffectiveParameterValues,
    (_, dashcardId: number) => dashcardId,
  ],
  (dashcards, parameters, parameterValues, dashcardId) => {
    const dashcard = dashcards[dashcardId];
    if (!dashcard || !hasInlineParameters(dashcard)) {
      return [];
    }
    const inlineParameters = dashcard.inline_parameters
      .map((parameterId) => parameters.find((p) => p.id === parameterId))
      .filter(isNotNull);
    return _getValuePopulatedParameters({
      parameters: inlineParameters,
      values: parameterValues,
    });
  },
);

export const getValuePopulatedParameters = createSelector(
  [getParameters, getEffectiveParameterValues],
  (parameters, values) => _getValuePopulatedParameters({ parameters, values }),
);

export const getMissingRequiredParameters = createSelector(
  [getParameters],
  (parameters) =>
    parameters.filter(
      (p) =>
        p.required &&
        (!p.default || (Array.isArray(p.default) && p.default.length === 0)),
    ),
);

/**
 * It's a memoized version, it uses LRU cache per card identified by id
 */
export const getQuestionByCard = createCachedSelector(
  [
    (_state: State, props: { card: Card | VirtualCard }) => props.card,
    getMetadata,
  ],
  (card, metadata) => {
    return isQuestionCard(card) ? new Question(card, metadata) : undefined;
  },
)((_state, props) => {
  // Virtual cards don't have an ID and should not return a question so we use "virtual" as a cache key for all of them
  return props.card.id == null ? "virtual" : props.card.id;
});

export const getDashcardParameterMappingOptions = createCachedSelector(
  [getQuestionByCard, getEditingParameter, getCard, getDashCard],
  (question, parameter, card, dashcard) => {
    return _getParameterMappingOptions(question, parameter, card, dashcard);
  },
)((state, props) => {
  return props.card.id ?? props.dashcard.id;
});

// Embeddings might be published without passing embedding_params to the server,
// in which case it's an empty object. We should treat such situations with
// caution, assuming that an absent parameter is "disabled".
export function getEmbeddedParameterVisibility(
  state: State,
  slug: string,
): EmbeddingParameterVisibility | null {
  const dashboard = getDashboard(state);
  if (!dashboard?.enable_embedding) {
    return null;
  }

  const embeddingParams = dashboard.embedding_params ?? {};
  return embeddingParams[slug] ?? "disabled";
}

export const getIsHeaderVisible = createSelector(
  [getIsEmbeddingIframe, getEmbedOptions],
  (isEmbeddingIframe, embedOptions) =>
    (isEmbeddingSdk() && isEmbeddingIframe) ||
    !isEmbeddingIframe ||
    !!embedOptions.header,
);

export const getIsAdditionalInfoVisible = createSelector(
  [getIsEmbeddingIframe, getEmbedOptions],
  (isEmbeddingIframe, embedOptions) =>
    !isEmbeddingIframe || !!embedOptions.additional_info,
);

export const getTabs = createSelector([getDashboard], (dashboard) => {
  if (!dashboard) {
    return [];
  }
  return dashboard.tabs?.filter((tab) => !tab.isRemoved) ?? [];
});

export const getSelectedTabId = createSelector(
  [
    getIsWebApp,
    (state) => getSetting(state, "site-url"),
    getDashboard,
    (state) => state.dashboard.selectedTabId,
  ],
  (isWebApp, siteUrl, dashboard, selectedTabId) => {
    if (dashboard && selectedTabId === null) {
      return getInitialSelectedTabId(dashboard, siteUrl, isWebApp);
    }

    return selectedTabId;
  },
);

export const getSelectedTab = createSelector(
  [getDashboard, getSelectedTabId],
  (dashboard, selectedTabId) => {
    if (!dashboard || selectedTabId === null) {
      return null;
    }
    return dashboard.tabs?.find((tab) => tab.id === selectedTabId) || null;
  },
);

export function getInitialSelectedTabId(
  dashboard: Dashboard | StoreDashboard,
  siteUrl: string,
  isWebApp: boolean,
) {
  const pathname = window.location.pathname.replace(siteUrl, "");
  const isDashboardUrl = pathname.includes("/dashboard/");

  if (isDashboardUrl) {
    const dashboardSlug = pathname.replace("/dashboard/", "");
    const dashboardUrlId = Urls.extractEntityId(dashboardSlug);
    const isNavigationInProgress = dashboardUrlId !== dashboard.id;
    if (!isNavigationInProgress || !isWebApp) {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get("tab");
      const tabId = tabParam ? parseInt(tabParam, 10) : null;
      const hasTab = dashboard.tabs?.some?.((tab) => tab.id === tabId);
      if (hasTab) {
        return tabId;
      }
    }
  }

  return dashboard.tabs?.[0]?.id || null;
}

export const getCurrentTabDashcards = createSelector(
  [getDashboardComplete, getSelectedTabId],
  (dashboard, selectedTabId) => {
    if (!dashboard || !Array.isArray(dashboard?.dashcards)) {
      return [];
    }
    if (!selectedTabId) {
      return dashboard.dashcards;
    }
    return dashboard.dashcards.filter(
      (dc: DashboardCard) => dc.dashboard_tab_id === selectedTabId,
    );
  },
);

export const getHiddenParameterSlugs = createSelector(
  [getDashboardComplete, getParameters, getIsEditing],
  (dashboard, parameters, isEditing) => {
    if (isEditing || !dashboard) {
      // All filters should be visible in edit mode
      return undefined;
    }

    const parameterIds = getMappedParametersIds(dashboard.dashcards);
    const hiddenParameters = parameters.filter(
      (parameter) => !parameterIds.includes(parameter.id),
    );

    return hiddenParameters.map((parameter) => parameter.slug).join(",");
  },
);

export const getTabHiddenParameterSlugs = createSelector(
  [getParameters, getCurrentTabDashcards, getIsEditing],
  (parameters, currentTabDashcards, isEditing) => {
    if (isEditing) {
      // All filters should be visible in edit mode
      return undefined;
    }

    const currentTabParameterIds = getMappedParametersIds(currentTabDashcards);
    const hiddenParameters = parameters.filter(
      (parameter) => !currentTabParameterIds.includes(parameter.id),
    );

    return hiddenParameters.map((p) => p.slug).join(",");
  },
);

export const getParameterMappingsBeforeEditing = createSelector(
  [getDashboardBeforeEditing],
  (editingDashboard) => {
    if (!editingDashboard) {
      return {};
    }

    const dashcards = editingDashboard.dashcards;
    const map: Record<
      ParameterId,
      Record<DashCardId, DashboardParameterMapping>
    > = {};

    // create a map like {[parameterId]: {[dashcardId]: parameterMapping}}
    for (const dashcard of dashcards) {
      if (!dashcard.parameter_mappings) {
        continue;
      }

      for (const parameterMapping of dashcard.parameter_mappings) {
        const parameterId = parameterMapping.parameter_id;

        if (!map[parameterId]) {
          map[parameterId] = {};
        }

        map[parameterId][dashcard.id] =
          parameterMapping as DashboardParameterMapping;
      }
    }

    return map;
  },
);

export const getDisplayTheme = (state: State) => state.dashboard.theme;

export const getIsNightMode = createSelector(
  [getDisplayTheme],
  (theme) => theme === "night",
);

export const getHasModelActionsEnabled = createSelector(
  [getMetadata],
  (metadata) => {
    if (!metadata) {
      return false;
    }

    const databases = metadata.databasesList();
    const hasModelActionsEnabled = Object.values(databases).some((database) =>
      // @ts-expect-error Schema types do not match
      hasDatabaseActionsEnabled(database),
    );

    return hasModelActionsEnabled;
  },
);

export const getFiltersToReset = createSelector(
  [getValuePopulatedParameters, getHiddenParameterSlugs],
  (parameters, hiddenParameterSlugs) => {
    const visibleParameters = getVisibleParameters(
      parameters,
      hiddenParameterSlugs,
    );
    return visibleParameters.filter(canResetFilter);
  },
);

export const getCanResetFilters = createSelector(
  [getFiltersToReset],
  (filtersToReset) => filtersToReset.length > 0,
);
