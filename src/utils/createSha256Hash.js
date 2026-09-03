const crypto = require("crypto");

/**
 * Persisted GraphQL query used to paginate IMDb episode lists.
 */
const EPISODES_PAGINATION_QUERY = `
    query TitleEpisodesSubPagePagination(
        $const: ID!
        $originalTitleText: Boolean!
        $first: Int!
        $after: ID!
        $filter: EpisodesFilter
        $sort: EpisodesSort
        $returnUrl: URL!
    ) {
        title(id: $const) {
            episodes {
                episodes(
                    first: $first
                    after: $after
                    filter: $filter
                    sort: $sort
                ) {
                    ...EpisodesItems
                }
            }
        }
    }
    
    fragment EpisodesItems on EpisodeConnection {
        total
        pageInfo {
            hasNextPage
            endCursor
        }
        edges {
            node {
                ...EpisodeItem
            }
        }
    }
    
    fragment EpisodeItem on Title {
        id
        titleText {
            text
        }
        titleType {
            id
        }
        plot {
            plotText {
                plainText(showOriginalTitleText: $originalTitleText)
            }
        }
        releaseDate {
            month
            day
            year
        }
        canRate {
            isRatable
        }
        ratingsSummary {
            aggregateRating
            voteCount
        }
        series {
            displayableEpisodeNumber {
                episodeNumber {
                    id
                    displayableProperty {
                        value {
                            plainText
                        }
                    }
                }
                displayableSeason {
                    id
                    displayableProperty {
                        value {
                            plainText
                        }
                    }
                }
            }
        }
        primaryImage {
            url
            height
            width
            caption {
                plainText(showOriginalTitleText: $originalTitleText)
            }
        }
        # Title.images defaults to useEntitlement: true; this consumer
        # subpage is server-cached under a viewer-blind key, so read the
        # public set.
        images(
            first: 1
            filter: { types: ["still_frame"] }
            useEntitlement: false
        ) {
            edges {
                node {
                    caption {
                        plainText(showOriginalTitleText: $originalTitleText)
                    }
                    height
                    width
                    url
                }
            }
        }
        imageUploadLink(
            contributionContext: {
                isInIframe: true
                returnUrl: $returnUrl
                business: "consumer"
            }
        ) {
            url
        }
    }


`;

/**
 * Returns the SHA-256 hash of the given text as a hex string.
 *
 * @param {string} text - Text to hash.
 * @returns {string}
 */
const createSha256Hash = (text) =>
  crypto.createHash("sha256").update(text).digest("hex");

module.exports = { createSha256Hash, EPISODES_PAGINATION_QUERY };
