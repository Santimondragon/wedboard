# Workflow Catalog

Every end-user workflow in Wedboard, mapped to the epic and feature spec that describes it.
A workflow is one goal a user completes in a single sitting. Each appears in **exactly one**
feature spec — that spec is authoritative for its rules, states and acceptance criteria.

Status is the owning spec's frontmatter `status:` — see the
[status legend](./README.md#status-legend).

| ID       | Workflow                                          | Epic                        | Actor            | Spec                                                                          | Status        |
| -------- | ------------------------------------------------- | --------------------------- | ---------------- | ----------------------------------------------------------------------------- | ------------- |
| WF-02-01 | Create a new event board                          | Event Setup                 | Owner / Co-owner | [EP-02-F01](epics/02-event-setup/F01-create-event.md)                         | `implemented` |
| WF-02-02 | Switch between event boards                       | Event Setup                 | Owner / Co-owner | [EP-02-F02](epics/02-event-setup/F02-event-directory-and-switcher.md)         | `implemented` |
| WF-02-03 | Edit event profile details                        | Event Setup                 | Owner / Co-owner | [EP-02-F03](epics/02-event-setup/F03-event-profile-settings.md)               | `partial`     |
| WF-02-04 | Change the event key                              | Event Setup                 | Owner / Co-owner | [EP-02-F04](epics/02-event-setup/F04-event-key.md)                            | `partial`     |
| WF-02-05 | Archive or reactivate an event                    | Event Setup                 | Owner / Co-owner | [EP-02-F05](epics/02-event-setup/F05-event-status-lifecycle.md)               | `defective`   |
| WF-02-06 | Permanently delete an event                       | Event Setup                 | Owner / Co-owner | [EP-02-F06](epics/02-event-setup/F06-delete-event.md)                         | `defective`   |
| WF-02-07 | Seed a demo event board                           | Event Setup                 | Owner / Co-owner | [EP-02-F07](epics/02-event-setup/F07-demo-event-seeding.md)                   | `defective`   |
| WF-02-08 | Connect a custom domain                           | Event Setup                 | Owner / Co-owner | [EP-02-F08](epics/02-event-setup/custom-domain/F08-connect-domain.md)         | `defective`   |
| WF-02-08 | Connect a custom domain                           | Event Setup                 | Owner / Co-owner | [EP-02-F08](epics/02-event-setup/custom-domain/F08-connect-domain.md)         | `defective`   |
| WF-02-09 | Verify custom domain DNS records                  | Event Setup                 | Owner / Co-owner | [EP-02-F09](epics/02-event-setup/custom-domain/F09-dns-verification.md)       | `implemented` |
| WF-02-09 | Verify custom domain DNS records                  | Event Setup                 | Owner / Co-owner | [EP-02-F09](epics/02-event-setup/custom-domain/F09-dns-verification.md)       | `implemented` |
| WF-02-10 | Remove a connected custom domain                  | Event Setup                 | Owner / Co-owner | [EP-02-F10](epics/02-event-setup/custom-domain/F10-remove-domain.md)          | `implemented` |
| WF-02-10 | Remove a connected custom domain                  | Event Setup                 | Owner / Co-owner | [EP-02-F10](epics/02-event-setup/custom-domain/F10-remove-domain.md)          | `implemented` |
| WF-02-11 | Visit the custom domain landing                   | Event Setup                 | Owner / Co-owner | [EP-02-F11](epics/02-event-setup/custom-domain/F11-countdown-landing.md)      | `implemented` |
| WF-02-11 | Visit the custom domain landing                   | Event Setup                 | Owner / Co-owner | [EP-02-F11](epics/02-event-setup/custom-domain/F11-countdown-landing.md)      | `implemented` |
| WF-03-01 | Share an event with a collaborator by email       | Collaboration & Permissions | Owner / Co-owner | [EP-03-F02](epics/03-collaboration-and-permissions/F02-add-member.md)         | `defective`   |
| WF-03-02 | Change an existing collaborator's event role      | Collaboration & Permissions | Owner / Co-owner | [EP-03-F03](epics/03-collaboration-and-permissions/F03-change-member-role.md) | `implemented` |
| WF-03-03 | Revoke a collaborator's access to the event       | Collaboration & Permissions | Owner / Co-owner | [EP-03-F04](epics/03-collaboration-and-permissions/F04-remove-member.md)      | `implemented` |
| WF-03-04 | Review recent changes made by collaborators       | Collaboration & Permissions | Owner / Co-owner | [EP-03-F05](epics/03-collaboration-and-permissions/F05-activity-log.md)       | `implemented` |
| WF-04-01 | Add a single guest                                | Guest Management            | Editor+          | [EP-04-F01](epics/04-guest-management/F01-add-guest.md)                       | `implemented` |
| WF-04-02 | Find a guest in the directory                     | Guest Management            | Editor+          | [EP-04-F02](epics/04-guest-management/F02-guest-directory.md)                 | `implemented` |
| WF-04-03 | Record a guest's answer by hand                   | Guest Management            | Editor+          | [EP-04-F03](epics/04-guest-management/F03-edit-guest-and-rsvp-override.md)    | `defective`   |
| WF-04-04 | Grant and manage a guest's +1                     | Guest Management            | Editor+          | [EP-04-F04](epics/04-guest-management/F04-plus-one-lifecycle.md)              | `defective`   |
| WF-04-05 | Remove a guest from the event                     | Guest Management            | Editor+          | [EP-04-F05](epics/04-guest-management/F05-delete-guest.md)                    | `implemented` |
| WF-04-06 | Add several guests to one invitation              | Guest Management            | Editor+          | [EP-04-F06](epics/04-guest-management/F06-bulk-guest-entry.md)                | `partial`     |
| WF-05-01 | Create invitation for a household                 | Invitations                 | Editor+          | [EP-05-F01](epics/05-invitations/F01-create-invitation.md)                    | `defective`   |
| WF-05-02 | Adjust an invitation's guest composition          | Invitations                 | Editor+          | [EP-05-F02](epics/05-invitations/F02-invitation-composition-and-lock.md)      | `partial`     |
| WF-05-03 | Copy and share an invitation link                 | Invitations                 | Editor+          | [EP-05-F03](epics/05-invitations/F03-invitation-link-and-slug.md)             | `defective`   |
| WF-05-04 | Track which invitations were sent                 | Invitations                 | Editor+          | [EP-05-F04](epics/05-invitations/F04-sent-tracking.md)                        | `implemented` |
| WF-05-05 | Edit, deactivate or delete an invitation          | Invitations                 | Editor+          | [EP-05-F05](epics/05-invitations/F05-edit-deactivate-delete.md)               | `partial`     |
| WF-06-01 | Create a special invitation                       | Special Invitations         | Editor+          | [EP-06-F01](epics/06-special-invitations/F01-manage-special-invitations.md)   | `implemented` |
| WF-06-02 | Edit a special invitation's details               | Special Invitations         | Editor+          | [EP-06-F01](epics/06-special-invitations/F01-manage-special-invitations.md)   | `implemented` |
| WF-06-03 | Delete a special invitation                       | Special Invitations         | Editor+          | [EP-06-F01](epics/06-special-invitations/F01-manage-special-invitations.md)   | `implemented` |
| WF-06-04 | Choose which invitations see it                   | Special Invitations         | Editor+          | [EP-06-F02](epics/06-special-invitations/F02-visibility-assignment.md)        | `implemented` |
| WF-06-05 | Override one guest's response                     | Special Invitations         | Editor+          | [EP-06-F03](epics/06-special-invitations/F03-dashboard-rsvp-override.md)      | `implemented` |
| WF-07-01 | Open an invitation link                           | Guest Experience            | Public guest     | [EP-07-F01](epics/07-guest-experience/F01-invitation-access-and-states.md)    | `implemented` |
| WF-07-02 | Submit the main RSVP                              | Guest Experience            | Public guest     | [EP-07-F02](epics/07-guest-experience/F02-rsvp-submission.md)                 | `partial`     |
| WF-07-03 | Declare a plus-one companion                      | Guest Experience            | Public guest     | [EP-07-F03](epics/07-guest-experience/F03-plus-one-declaration.md)            | `implemented` |
| WF-07-04 | Report dietary restrictions                       | Guest Experience            | Public guest     | [EP-07-F04](epics/07-guest-experience/F04-dietary-preferences.md)             | `defective`   |
| WF-07-05 | Respond to a special invitation                   | Guest Experience            | Public guest     | [EP-07-F05](epics/07-guest-experience/F05-special-invitation-rsvp.md)         | `implemented` |
| WF-07-06 | Leave the hosts a message                         | Guest Experience            | Public guest     | [EP-07-F06](epics/07-guest-experience/F06-guest-message.md)                   | `implemented` |
| WF-07-07 | Visit the custom-domain root                      | Guest Experience            | Public guest     | [EP-07-F07](epics/07-guest-experience/F07-custom-domain-landing.md)           | `implemented` |
| WF-07-08 | Follow a broken invitation link                   | Guest Experience            | Public guest     | [EP-07-F08](epics/07-guest-experience/F08-error-and-not-found-states.md)      | `implemented` |
| WF-08-01 | Choose an invitation template                     | Invitation Design Studio    | Editor+          | [EP-08-F01](epics/08-invitation-design-studio/F01-template-selection.md)      | `partial`     |
| WF-08-02 | Switch between RSVP variant tabs                  | Invitation Design Studio    | Editor+          | [EP-08-F02](epics/08-invitation-design-studio/F02-layout-variants.md)         | `defective`   |
| WF-08-03 | Reset a variant to default                        | Invitation Design Studio    | Editor+          | [EP-08-F02](epics/08-invitation-design-studio/F02-layout-variants.md)         | `defective`   |
| WF-08-04 | Save all three layout variants                    | Invitation Design Studio    | Editor+          | [EP-08-F02](epics/08-invitation-design-studio/F02-layout-variants.md)         | `defective`   |
| WF-08-05 | Add a block                                       | Invitation Design Studio    | Editor+          | [EP-08-F03](epics/08-invitation-design-studio/F03-block-composition.md)       | `defective`   |
| WF-08-06 | Reorder, duplicate or remove blocks               | Invitation Design Studio    | Editor+          | [EP-08-F03](epics/08-invitation-design-studio/F03-block-composition.md)       | `defective`   |
| WF-08-07 | Author a block's content fields                   | Invitation Design Studio    | Editor+          | [EP-08-F04](epics/08-invitation-design-studio/F04-block-configuration.md)     | `defective`   |
| WF-08-08 | Preview the layout before saving                  | Invitation Design Studio    | Editor+          | [EP-08-F06](epics/08-invitation-design-studio/F06-live-preview.md)            | `partial`     |
| WF-09-01 | Upload an image to the library                    | Media Library               | Editor+          | [EP-09-F01](epics/09-media-library/F01-upload-media.md)                       | `implemented` |
| WF-09-02 | Browse and rename library images                  | Media Library               | Editor+          | [EP-09-F02](epics/09-media-library/F02-manage-media.md)                       | `defective`   |
| WF-09-03 | Delete an image and its blob                      | Media Library               | Editor+          | [EP-09-F02](epics/09-media-library/F02-manage-media.md)                       | `defective`   |
| WF-09-04 | Pick an image for a block field                   | Media Library               | Editor+          | [EP-09-F03](epics/09-media-library/F03-media-picker.md)                       | `implemented` |
| WF-10-01 | Author the social card copy                       | Sharing & SEO               | Editor+          | [EP-10-F01](epics/10-sharing-and-seo/F01-social-card-metadata.md)             | `partial`     |
| WF-10-02 | Choose the social preview image                   | Sharing & SEO               | Editor+          | [EP-10-F01](epics/10-sharing-and-seo/F01-social-card-metadata.md)             | `partial`     |
| WF-10-03 | Preview the card before sharing                   | Sharing & SEO               | Editor+          | [EP-10-F01](epics/10-sharing-and-seo/F01-social-card-metadata.md)             | `partial`     |
| WF-10-04 | Share an invitation link publicly                 | Sharing & SEO               | Editor+          | [EP-10-F01](epics/10-sharing-and-seo/F01-social-card-metadata.md)             | `partial`     |
| WF-10-05 | Upload a browser-tab favicon                      | Sharing & SEO               | Editor+          | [EP-10-F02](epics/10-sharing-and-seo/F02-favicon.md)                          | `implemented` |
| WF-11-01 | Add a food option to the event                    | Catering                    | Editor+          | [EP-11-F01](epics/11-catering/F01-menu-options.md)                            | `defective`   |
| WF-11-02 | Edit an existing catering option                  | Catering                    | Editor+          | [EP-11-F01](epics/11-catering/F01-menu-options.md)                            | `defective`   |
| WF-11-03 | Toggle an option active or inactive               | Catering                    | Editor+          | [EP-11-F01](epics/11-catering/F01-menu-options.md)                            | `defective`   |
| WF-11-04 | Delete a catering option permanently              | Catering                    | Editor+          | [EP-11-F01](epics/11-catering/F01-menu-options.md)                            | `defective`   |
| WF-11-05 | Add a drink option to the event                   | Catering                    | Editor+          | [EP-11-F02](epics/11-catering/F02-drink-options.md)                           | `defective`   |
| WF-11-06 | Review per-option guest selection tallies         | Catering                    | Editor+          | [EP-11-F03](epics/11-catering/F03-selection-reporting.md)                     | `defective`   |
| WF-12-01 | Create a table for the reception                  | Seating                     | Editor+          | [EP-12-F01](epics/12-seating/F01-manage-tables.md)                            | `implemented` |
| WF-12-02 | Rename a table inline                             | Seating                     | Editor+          | [EP-12-F01](epics/12-seating/F01-manage-tables.md)                            | `implemented` |
| WF-12-03 | Resize a table's seat count                       | Seating                     | Editor+          | [EP-12-F01](epics/12-seating/F01-manage-tables.md)                            | `implemented` |
| WF-12-04 | Delete a table and free guests                    | Seating                     | Editor+          | [EP-12-F01](epics/12-seating/F01-manage-tables.md)                            | `implemented` |
| WF-12-05 | Seat an unassigned guest                          | Seating                     | Editor+          | [EP-12-F02](epics/12-seating/F02-seat-assignment.md)                          | `defective`   |
| WF-12-06 | Unseat or move a seated guest                     | Seating                     | Editor+          | [EP-12-F02](epics/12-seating/F02-seat-assignment.md)                          | `defective`   |
| WF-13-01 | Host reads the guest message inbox                | Host Inbox                  | Editor+          | [EP-13-F01](epics/13-host-inbox/F01-guest-messages.md)                        | `partial`     |
| WF-13-02 | Host traces a message back to its invitation      | Host Inbox                  | Editor+          | [EP-13-F01](epics/13-host-inbox/F01-guest-messages.md)                        | `partial`     |
| WF-14-01 | Host checks event status at a glance              | Insights                    | Editor+          | [EP-14-F01](epics/14-insights/F01-overview-dashboard.md)                      | `defective`   |
| WF-14-02 | Host jumps to a section via Quick Actions         | Insights                    | Editor+          | [EP-14-F01](epics/14-insights/F01-overview-dashboard.md)                      | `defective`   |
| WF-14-03 | New host seeds demo data from the empty overview  | Insights                    | Editor+          | [EP-14-F01](epics/14-insights/F01-overview-dashboard.md)                      | `defective`   |
| WF-15-01 | Review every event on the platform                | Platform Administration     | Superadmin       | [EP-15-F01](epics/15-platform-administration/F01-admin-console.md)            | `partial`     |
| WF-15-02 | Review every user on the platform                 | Platform Administration     | Superadmin       | [EP-15-F01](epics/15-platform-administration/F01-admin-console.md)            | `partial`     |
| WF-15-03 | Open a customer event for support                 | Platform Administration     | Superadmin       | [EP-15-F01](epics/15-platform-administration/F01-admin-console.md)            | `partial`     |
| WF-15-04 | Grant the superadmin role by email                | Platform Administration     | Superadmin       | [EP-15-F02](epics/15-platform-administration/F02-superadmin-provisioning.md)  | `partial`     |
| WF-16-01 | Visitor discovers Wedboard and signs up           | Marketing & Monetization    | Anonymous        | [EP-16-F01](epics/16-marketing-and-monetization/F01-marketing-site.md)        | `defective`   |
| WF-16-02 | Returning user signs in from the landing page     | Marketing & Monetization    | Anonymous        | [EP-16-F01](epics/16-marketing-and-monetization/F01-marketing-site.md)        | `defective`   |
| WF-16-03 | Signed-out user is bounced to the landing page    | Marketing & Monetization    | Anonymous        | [EP-16-F01](epics/16-marketing-and-monetization/F01-marketing-site.md)        | `defective`   |
| WF-16-04 | Visitor compares plans and subscribes (proposed)  | Marketing & Monetization    | Anonymous        | [EP-16-F02](epics/16-marketing-and-monetization/F02-pricing-and-billing.md)   | `proposed`    |
| WF-16-05 | Owner upgrades on hitting a plan limit (proposed) | Marketing & Monetization    | Anonymous        | [EP-16-F02](epics/16-marketing-and-monetization/F02-pricing-and-billing.md)   | `proposed`    |

**86 workflows** across 16 epics and 64 feature specs.

## Coverage notes

- Workflows are numbered within their epic (`WF-NN-NN`); the epic number matches the spec's.
- A workflow marked `defective` or `partial` completes only in part — read its spec's §14
  before relying on it. Consolidated in [backlog.md](./backlog.md).
- The public guest performs the EP-07 workflows without an account; every other workflow
  requires an authenticated user holding a per-event role
  ([roles-and-permissions.md](./roles-and-permissions.md)).
