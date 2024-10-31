import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GeneratedAssetLoading() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <Skeleton className="h-12 w-3/4 max-w-2xl" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="script" className="space-y-4">
        <TabsList>
          <TabsTrigger value="script">
            <Skeleton className="h-4 w-24" />
          </TabsTrigger>
          <TabsTrigger value="audio">
            <Skeleton className="h-4 w-16" />
          </TabsTrigger>
          <TabsTrigger value="video">
            <Skeleton className="h-4 w-16" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="script">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-8">
                {[1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="flex flex-col md:flex-row items-start gap-4"
                  >
                    <Skeleton className="w-full md:w-1/3 h-48 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full max-w-sm" />
        </CardContent>
      </Card>
    </div>
  );
}
