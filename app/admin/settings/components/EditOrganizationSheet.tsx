"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { PolandFlag } from "@/components/icons/PolandFlag";
import { UKFlag } from "@/components/icons/UKFlag";
// import { useOrganization } from '@/components/app-layout-client'

interface Organization {
  id: string;
  name: string;
  brand_color?: string | null;
  country_code?: string;
  locale?: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url?: string | null;
  isOwner?: boolean;
}

interface EditOrganizationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization | null;
  users: User[];
  currentOwnerId: string | null;
  canManageOwnership: boolean;
  onSave: (data: any) => void;
}

export function EditOrganizationSheet({
  open,
  onOpenChange,
  organization,
  users,
  currentOwnerId,
  canManageOwnership,
  onSave,
}: EditOrganizationSheetProps) {
  // const { updateOrganization } = useOrganization()

  const [formData, setFormData] = useState({
    name: organization?.name || "",
    ownerId: currentOwnerId || "",
    countryCode: organization?.country_code || "PL",
    locale: organization?.locale || "pl",
  });

  const allUsers = users; // Show all users, not just admins
  const ownerSelectionDisabled = !canManageOwnership;

  // Sync form data when organization changes
  useEffect(() => {
    if (organization && users.length > 0) {
      const ownerFromProps = users.find((user) => user.id === currentOwnerId);
      const fallbackAdmin = users[0];

      setFormData({
        name: organization.name || "",
        ownerId: ownerFromProps?.id || fallbackAdmin?.id || "",
        countryCode: organization.country_code || "PL",
        locale: organization.locale || "pl",
      });
    }
  }, [organization, users, currentOwnerId]);

  const handleSave = async () => {
    try {
      console.log("=== HANDLE SAVE START ===");
      console.log("Sending form data:", formData);
      console.log("Selected ownerId:", formData.ownerId);
      console.log(
        "Available users:",
        users.map((u) => ({ id: u.id, email: u.email, role: u.role })),
      );

      // Get organization ID from the current organization being edited
      const organizationId = organization?.id;
      console.log("Organization ID:", organizationId);

      const response = await fetch("/api/admin/settings/organization", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Organization-ID": organizationId || "", // Pass organization context
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          console.error("Failed to parse error response:", e);
          errorData = { error: "Failed to parse error response" };
        }

        console.error("API Error Details:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: response.url,
        });

        const errorMessage =
          (errorData as any).error || "Failed to save organization settings";
        const errorDetails =
          (errorData as any).details ||
          (errorData as any).stack ||
          "No additional details";

        console.error("Error message:", errorMessage);
        console.error("Error details:", errorDetails);

        throw new Error(`${errorMessage} - ${errorDetails}`);
      }

      let result;
      try {
        result = await response.json();
        console.log("API Success Response:", result);
      } catch (e) {
        console.error("Failed to parse success response:", e);
        throw new Error("Failed to parse API response");
      }

      // Update the organization context with the new data
      // TODO: Re-enable when useOrganization import is fixed
      // if (result.organization) {
      //   updateOrganization({
      //     name: result.organization.name,
      //     brand_color: result.organization.brand_color,
      //     logo_url: result.organization.logo_url,
      //     locale: result.organization.locale
      //   })
      // }

      onSave(result.organization);
      toast.success("Zmiany zostały zapisane");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving organization settings:", error);
      toast.error("Błąd podczas zapisywania zmian");
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form data
    setFormData({
      name: organization?.name || "",
      ownerId: currentOwnerId || "",
      countryCode: organization?.country_code || "PL",
      locale: organization?.locale || "pl",
    });
  };

  const getUserInitials = (user: User) => {
    if (user.full_name) {
      return user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg" className="overflow-y-auto p-0">
        <div className="bg-background relative rounded-lg h-full flex flex-col">
          {/* Header */}
          <div className="p-6 pb-0">
            <SheetTitle className="text-xl font-semibold text-foreground">
              Edycja workspace
            </SheetTitle>
          </div>

          {/* Separator */}
          <div className="h-px bg-border mt-6 mx-6" />

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto p-6 pt-6 space-y-6">
            <div className="space-y-4">
              {/* Organization Name */}
              <div className="space-y-2">
                <Label htmlFor="org-name">Nazwa workspace</Label>
                <Input
                  id="org-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nazwa workspace"
                />
              </div>

              {/* Owner Selector */}
              <div className="space-y-2">
                <Label>Wybierz właściciela workspace</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild disabled={ownerSelectionDisabled}>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-auto min-h-9 px-3 py-2"
                      disabled={ownerSelectionDisabled}
                    >
                      {formData.ownerId ? (
                        (() => {
                          const selectedUser = allUsers.find(
                            (u) => u.id === formData.ownerId,
                          );
                          return selectedUser ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={selectedUser.avatar_url || undefined}
                                />
                                <AvatarFallback className="text-sm">
                                  {getUserInitials(selectedUser)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col items-start">
                                <span className="font-medium text-sm">
                                  {selectedUser.full_name || selectedUser.email}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {selectedUser.email}
                                </span>
                              </div>
                            </div>
                          ) : null;
                        })()
                      ) : (
                        <span className="text-muted-foreground">
                          Wybierz właściciela workspace
                        </span>
                      )}
                      <ChevronDown className="size-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    {allUsers.map((user, index, array) => (
                      <React.Fragment key={user.id}>
                        <DropdownMenuItem
                          onClick={() => {
                            console.log(
                              "Setting owner to:",
                              user.id,
                              user.full_name || user.email,
                            );
                            setFormData((prev) => ({
                              ...prev,
                              ownerId: user.id,
                            }));
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="text-sm">
                                {getUserInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {user.full_name || user.email}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </DropdownMenuItem>
                        {index < array.length - 1 && <DropdownMenuSeparator />}
                      </React.Fragment>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {ownerSelectionDisabled && (
                  <p className="text-xs text-muted-foreground">
                    Tylko obecny właściciel workspace może przekazać tę rolę innemu administratorowi. Poproś właściciela o aktualizację.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Holiday Calendar */}
              <div className="space-y-2">
                <Label htmlFor="holiday-calendar">Kalendarz świąt</Label>
                <Select
                  value={formData.countryCode}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, countryCode: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      {formData.countryCode === "PL" && (
                        <PolandFlag size={16} />
                      )}
                      {formData.countryCode === "IE" && <UKFlag size={16} />}
                      {formData.countryCode === "US" && <UKFlag size={16} />}
                      <span className="font-medium text-sm">
                        {formData.countryCode === "PL"
                          ? "Polska"
                          : formData.countryCode === "IE"
                            ? "Irlandia"
                            : formData.countryCode === "US"
                              ? "Stany Zjednoczone"
                              : "Polska"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PL">
                      <div className="flex items-center gap-2">
                        <PolandFlag size={16} />
                        <span>Polska</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="IE">
                      <div className="flex items-center gap-2">
                        <UKFlag size={16} />
                        <span>Irlandia</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="US">
                      <div className="flex items-center gap-2">
                        <UKFlag size={16} />
                        <span>Stany Zjednoczone</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Primary Language */}
              <div className="space-y-2">
                <Label htmlFor="primary-language">Język podstawowy</Label>
                <Select
                  value={formData.locale}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, locale: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      {formData.locale === "pl" && <PolandFlag size={16} />}
                      {formData.locale === "en" && <UKFlag size={16} />}
                      <span className="font-medium text-sm">
                        {formData.locale === "pl"
                          ? "Polski"
                          : formData.locale === "en"
                            ? "English"
                            : "Polski"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pl">
                      <div className="flex items-center gap-2">
                        <PolandFlag size={16} />
                        <span>Polski</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="en">
                      <div className="flex items-center gap-2">
                        <UKFlag size={16} />
                        <span>English</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Domyślny język dla nowych użytkowników. Użytkownicy mogą
                  zmienić język w swoim profilu.
                </p>
              </div>
            </div>
          </div>

          {/* Delete Workspace Section - Fixed at bottom above footer */}
          <div className="p-6">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <div className="mt-0.5 flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-destructive"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-destructive mb-1">
                    Usuń workspace
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    This is a toast description. Lorem ipsum dolor sit amet
                    consectetur. Adipiscing sed vitae adipiscing arcu dolor.
                    Laoreet massa cursus tincidunt nulla convallis.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      // TODO: Implement delete workspace functionality
                      toast.error(
                        "Funkcja usuwania workspace będzie wkrótce dostępna",
                      );
                    }}
                  >
                    Usuń workspace
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Separator before footer */}
          <div className="h-px bg-border mx-6" />

          {/* Footer - Fixed at Bottom */}
          <div className="flex flex-row gap-2 items-center justify-between w-full p-6 bg-background">
            <Button variant="outline" onClick={handleCancel} className="h-9">
              Anuluj
            </Button>
            <Button onClick={handleSave} className="h-9">
              Zapisz
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
