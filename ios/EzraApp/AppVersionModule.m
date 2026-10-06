#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface AppVersionModule : NSObject <RCTBridgeModule>
@end

@implementation AppVersionModule

RCT_EXPORT_MODULE(AppVersion)

- (NSDictionary *)constantsToExport
{
  NSBundle *bundle = [NSBundle mainBundle];
  NSString *versionName = [bundle objectForInfoDictionaryKey:@"CFBundleShortVersionString"];
  NSString *versionCode = [bundle objectForInfoDictionaryKey:@"CFBundleVersion"];

  return @{
    @"versionName": versionName ?: @"",
    @"versionCode": versionCode ?: @"",
  };
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
